import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, newTariff } from "../src/lib/domain";
import {
  recordHistorical,
  recordCurrent,
  correctPeriod,
  tariffPeriods,
  comparePeriod,
  removePeriod,
  periodProblem,
} from "../src/lib/tariff-periods";

test("backfills an independent historical period, permits gaps and rejects overlaps", () => {
  const tariff = { ...newTariff(), name: "Previous", energyPeak: "0.2" };
  const original = emptyWorkspace();
  const first = recordHistorical(original, tariff, "2025-01-01", "2025-03-01");
  tariff.energyPeak = "0.4";
  assert.equal(first.history[0].tariff.energyPeak, "0.2");
  assert.equal(first.currentId, null);
  assert.equal(first.tariffs.length, 0);
  assert.equal(original.history.length, 0);
  const second = recordHistorical(first, tariff, "2025-04-01", "2025-06-01");
  assert.equal(second.history.length, 2);
  assert.throws(
    () => recordHistorical(second, tariff, "2025-02-01", "2025-04-01"),
    /solapa/,
  );
  assert.throws(
    () => recordHistorical(first, tariff, "2025-03-01", "2025-03-01"),
    /posterior/,
  );
  assert.equal(
    recordHistorical(first, tariff, "2025-03-01", "2025-04-01").history.length,
    2,
  );
});

test("rejects record additions at storage limits before changing any workspace data", () => {
  const t = { ...newTariff(), name: "Contract" };
  const full = emptyWorkspace();
  full.tariffs = Array.from({ length: 100 }, () => ({
    ...t,
    id: crypto.randomUUID(),
  }));
  assert.throws(() => recordCurrent(full, t, "2025-01-01"), /100 tarifas/);
  assert.equal(full.tariffs.length, 100);
  assert.equal(full.currentId, null);
  // Recording an existing candidate consumes its slot, so it still fits.
  assert.equal(
    recordCurrent(full, full.tariffs[0], "2025-01-01").tariffs.length,
    100,
  );
  const historyFull = emptyWorkspace();
  historyFull.history = Array.from({ length: 500 }, () => ({
    id: crypto.randomUUID(),
    tariff: t,
    start: "2024-01-01",
    end: "2024-01-01",
  }));
  assert.throws(
    () => recordHistorical(historyFull, t, "2025-01-01", "2025-06-01"),
    /500 períodos/,
  );
  const current = recordCurrent(historyFull, t, "2025-01-01");
  assert.throws(
    () => recordCurrent(current, { ...t, energyPeak: "0.2" }, "2025-06-01"),
    /500 períodos/,
  );
  assert.equal(current.history.length, 500);
  assert.equal(current.currentSince, "2025-01-01");
});

test("preserves legacy date problems while allowing unrelated history and explicit repairs", () => {
  const t = { ...newTariff(), name: "Old terms" };
  const w = emptyWorkspace();
  w.history = [
    {
      id: crypto.randomUUID(),
      tariff: t,
      start: "2024-01-01",
      end: "2024-01-01",
    },
    {
      id: crypto.randomUUID(),
      tariff: t,
      start: "2024-02-01",
      end: "2024-05-01",
    },
    {
      id: crypto.randomUUID(),
      tariff: t,
      start: "2024-04-01",
      end: "2024-06-01",
    },
  ];
  const added = recordHistorical(w, t, "2025-01-01", "2025-06-01");
  assert.deepEqual(added.history.slice(0, 3), w.history);
  assert.equal(
    tariffPeriods(added).filter((p) => periodProblem(p, tariffPeriods(added)))
      .length,
    3,
  );
  const repaired = correctPeriod(added, w.history[0].id, t, {
    start: "2023-12-01",
    end: "2024-01-01",
  });
  assert.equal(repaired.history[0].start, "2023-12-01");
  assert.equal(repaired.history.length, 4);
  assert.throws(() => recordCurrent(repaired, t, "2024-04-15"), /solapa/);
  assert.throws(
    () => recordHistorical(repaired, t, "2099-01-01", "2099-02-01"),
    /futuro/,
  );
});

test("moving both sides of a boundary rejects collisions with a third period atomically", () => {
  const t = { ...newTariff(), name: "A" };
  const a = recordHistorical(emptyWorkspace(), t, "2025-01-01", "2025-03-01");
  const b = recordHistorical(
    a,
    { ...t, name: "B" },
    "2025-03-01",
    "2025-06-01",
  );
  const c = recordHistorical(
    b,
    { ...t, name: "C" },
    "2025-07-01",
    "2025-09-01",
  );
  const before = structuredClone(c);
  assert.throws(
    () =>
      correctPeriod(c, c.history[0].id, t, {
        start: "2025-01-01",
        end: "2025-08-01",
        moveBoundary: true,
      }),
    /posterior|solapa/,
  );
  assert.deepEqual(c, before);
  const corrected = correctPeriod(c, c.history[0].id, t, {
    start: "2025-01-01",
    end: "2025-04-01",
    moveBoundary: true,
  });
  assert.equal(corrected.history[0].end, "2025-04-01");
  assert.equal(corrected.history[1].start, "2025-04-01");
  assert.equal(corrected.history[2].start, "2025-07-01");
});

test("removing a record leaves a gap or no current tariff without reactivating history", () => {
  const t = { ...newTariff(), name: "A" };
  const first = recordCurrent(emptyWorkspace(), t, "2025-01-01");
  const second = recordCurrent(first, { ...t, name: "B" }, "2025-06-01");
  const removed = removePeriod(second, second.currentId!);
  assert.equal(removed.currentId, null);
  assert.equal(removed.currentSince, "");
  assert.equal(removed.tariffs.length, 0);
  assert.deepEqual(removed.history, second.history);
  const gap = removePeriod(second, second.history[0].id);
  assert.equal(gap.history.length, 0);
  assert.equal(gap.currentSince, "2025-06-01");
  assert.equal(gap.currentId, second.currentId);
  assert.equal(second.history.length, 1);
});

test("brings recorded prices back into comparison as an independent candidate", () => {
  const t = {
    ...newTariff(),
    name: "A",
    energyPeak: "0.2",
    validUntil: "2025-02-01",
  };
  const original = recordHistorical(
    emptyWorkspace(),
    t,
    "2025-01-01",
    "2025-06-01",
  );
  const copied = comparePeriod(original, original.history[0].id);
  assert.equal(copied.tariffs.length, 1);
  assert.notEqual(copied.tariffs[0].id, original.history[0].tariff.id);
  assert.equal(copied.tariffs[0].validUntil, "2025-02-01");
  copied.tariffs[0].energyPeak = "0.1";
  assert.equal(copied.history[0].tariff.energyPeak, "0.2");
  assert.equal(copied.currentId, null);
  assert.equal(original.tariffs.length, 0);
});

test("corrects a shared boundary and prices without adding history or changing recorded bills", () => {
  const t = { ...newTariff(), name: "A", energyPeak: "0.2" };
  const a = recordCurrent(emptyWorkspace(), t, "2025-01-01");
  const b = recordCurrent(a, { ...t, name: "B" }, "2025-06-01");
  const bill = {
    id: crypto.randomUUID(),
    month: "2025-06",
    provider: "Supplier",
    paid: "40",
    credit: "0",
    kwh: "200",
    notes: "",
    tariff: structuredClone(b.tariffs[0]),
    profile: null,
    breakdown: null,
    periodStart: "",
    periodEnd: "",
  };
  b.bills = [bill];
  const current = tariffPeriods(b)[0];
  const corrected = correctPeriod(
    b,
    current.id,
    { ...current.tariff, energyPeak: "0.15" },
    { start: "2025-06-05", end: "", moveBoundary: true },
  );
  assert.equal(corrected.history.length, 1);
  assert.equal(corrected.history[0].end, "2025-06-05");
  assert.equal(corrected.currentSince, "2025-06-05");
  assert.equal(corrected.tariffs[0].energyPeak, "0.15");
  assert.equal(corrected.bills[0].tariff?.energyPeak, "0.2");
  assert.equal(b.currentSince, "2025-06-01");
  assert.throws(
    () =>
      correctPeriod(b, current.id, current.tariff, {
        start: "2025-05-01",
        end: "",
        moveBoundary: false,
      }),
    /solapa/,
  );
  const gap = correctPeriod(b, current.id, current.tariff, {
    start: "2025-06-05",
    end: "",
    moveBoundary: false,
  });
  assert.equal(gap.history[0].end, "2025-06-01");
});

test("records real contract changes with independent terms and archives the former baseline", () => {
  const offer = { ...newTariff(), name: "Offer", energyPeak: "0.2" };
  const original = { ...emptyWorkspace(), tariffs: [offer] };
  const current = recordCurrent(original, offer, "2025-01-01");
  assert.notEqual(current.currentId, offer.id);
  assert.equal(current.tariffs.length, 1);
  assert.equal(current.currentSince, "2025-01-01");
  const revised = { ...current.tariffs[0], energyPeak: "0.15" };
  const changed = recordCurrent(current, revised, "2025-06-01");
  assert.equal(changed.tariffs.length, 1);
  assert.equal(changed.history[0].tariff.energyPeak, "0.2");
  assert.equal(changed.history[0].start, "2025-01-01");
  assert.equal(changed.history[0].end, "2025-06-01");
  assert.equal(changed.currentSince, "2025-06-01");
  assert.equal(current.history.length, 0);
  assert.throws(
    () => recordCurrent(current, revised, "2025-01-01"),
    /posterior/,
  );
});
