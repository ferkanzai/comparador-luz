import { test } from "node:test";
import assert from "node:assert/strict";
import {
  billSchema,
  changeCurrent,
  emptyWorkspace,
  newTariff,
  tariffSchema,
  workspaceSchema,
} from "../src/lib/domain";
import { calculate } from "../src/lib/calculator";
import {
  billBuckets,
  billFromCalculation,
  billReconciliation,
} from "../src/lib/bill-data";
import { tariffFromInvoiceAmounts } from "../src/lib/invoice-prices";
import { readDraft, writeDraft } from "../src/lib/workspace-draft";

const profile = {
  ...emptyWorkspace().profile,
  days: "30",
  peakKwh: "100",
  flatKwh: "50",
  valleyKwh: "100",
  peakKw: "4",
  valleyKw: "4",
};
const tariff = {
  ...newTariff(),
  name: "Separate SNOEE",
  energyPeak: "0.2",
  energyFlat: "0.15",
  energyValley: "0.1",
  powerPeak: "0.1",
  powerValley: "0.03",
  snoeeKwh: "0,003",
};

test("SNOEE uses all consumption in either tariff kind, rounds once, and stays when taxes are off", () => {
  for (const kind of ["fixed", "periods"] as const) {
    const base = calculate({ ...tariff, kind, snoeeKwh: "" }, profile)!;
    const cost = calculate({ ...tariff, kind }, profile)!;
    assert.equal(cost.snoee, 0.75);
    assert.equal(cost.total, base.total + 0.75);
    assert.equal(cost.electricityTax, 0);
    assert.equal(cost.vat, 0);
    const rounded = calculate(
      { ...tariff, kind, snoeeKwh: "0.004" },
      { ...profile, peakKwh: "1", flatKwh: "1", valleyKwh: "1" },
    )!;
    assert.equal(
      rounded.snoee,
      0.01,
      "round the total charge, not each period",
    );
    assert.equal(
      calculate(tariff, {
        ...profile,
        peakKwh: "0",
        flatKwh: "0",
        valleyKwh: "0",
      })!.snoee,
      0,
    );
  }
});

test("SNOEE enters both tax bases independently of the social-financing switch", () => {
  for (const socialInElectricityTax of [true, false]) {
    const cost = calculate(
      {
        ...tariff,
        socialDay: "0.04",
        meterDay: "0.03",
        servicesMonth: "10",
        socialInElectricityTax,
      },
      { ...profile, taxes: true, electricityTax: "5.11269632", vat: "21" },
    )!;
    assert.equal(cost.electricityBase, socialInElectricityTax ? 55.05 : 53.85);
    assert.equal(cost.electricityTax, socialInElectricityTax ? 2.81 : 2.75);
    assert.equal(cost.vatBase, socialInElectricityTax ? 58.76 : 58.7);
    assert.equal(cost.vat, socialInElectricityTax ? 12.34 : 12.33);
    assert.equal(cost.servicesVat, 2.07);
    assert.equal(cost.total, socialInElectricityTax ? 83.03 : 82.96);
  }
});

test("legacy tariff and bill schemas add no cost and reject invalid SNOEE inputs", () => {
  const oldTariff = { ...tariff, snoeeKwh: undefined };
  const parsed = tariffSchema.parse(oldTariff);
  assert.equal(parsed.snoeeKwh, "");
  assert.equal(calculate(parsed, profile)!.total, 53.1);
  const bill = billFromCalculation(
    parsed,
    profile,
    calculate(parsed, profile)!,
  );
  const restored = billSchema.parse({
    ...bill,
    breakdown: { ...bill.breakdown, snoee: undefined },
  });
  assert.equal(restored.breakdown!.snoee, "0");
  assert.equal(restored.paid, bill.paid);
  for (const snoeeKwh of ["-1", "NaN", "Infinity", "101", "0,"]) {
    assert.equal(
      tariffSchema.safeParse({ ...tariff, snoeeKwh }).success,
      false,
    );
    assert.equal(calculate({ ...tariff, snoeeKwh }, profile), null);
  }
});

test("recorded SNOEE participates in reconciliation and charts and remains independent of its tariff", () => {
  const t = { ...tariff };
  const bill = billFromCalculation(t, profile, calculate(t, profile)!);
  assert.equal(bill.breakdown!.snoee, "0.75");
  assert.equal(billBuckets(bill).other, 0.75);
  assert.equal(billReconciliation(bill)!.difference, 0);
  t.snoeeKwh = "0.02";
  assert.equal(bill.tariff!.snoeeKwh, "0,003");
  assert.equal(
    billSchema.safeParse({
      ...bill,
      breakdown: { ...bill.breakdown, snoee: "1" },
    }).success,
    false,
  );
  const corrected = billSchema.parse({
    ...bill,
    paid: "54.1",
    breakdown: { ...bill.breakdown, snoee: "1" },
  });
  assert.equal(
    corrected.tariff!.snoeeKwh,
    "0,003",
    "actual amounts do not rewrite prices",
  );
  assert.equal(billBuckets(corrected).other, 1);
});

test("SNOEE prices and amounts survive history, JSON exports and browser draft recovery", () => {
  const next = { ...tariff, id: crypto.randomUUID(), snoeeKwh: "0.004" };
  const bill = billFromCalculation(
    tariff,
    profile,
    calculate(tariff, profile)!,
  );
  const changed = changeCurrent(
    {
      ...emptyWorkspace(),
      profile,
      tariffs: [tariff, next],
      bills: [bill],
      currentId: tariff.id,
      currentSince: "2026-07-01",
    },
    next.id,
    "2026-09-01",
  );
  const exported = workspaceSchema.parse(JSON.parse(JSON.stringify(changed)));
  assert.equal(exported.history[0].tariff.snoeeKwh, "0,003");
  assert.equal(exported.bills[0].breakdown!.snoee, "0.75");
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
  assert.ok(writeDraft(storage, "guest", { data: exported, version: 0 }));
  assert.deepEqual(readDraft(storage, "guest")!.data, exported);
  const legacy = JSON.parse(JSON.stringify(exported));
  for (const t of legacy.tariffs) delete t.snoeeKwh;
  for (const h of legacy.history) delete h.tariff.snoeeKwh;
  for (const b of legacy.bills) {
    delete b.tariff.snoeeKwh;
    delete b.breakdown.snoee;
    b.paid = String(Number(b.paid) - 0.75);
  }
  storage.setItem(
    "luz:comparison-draft:v1:guest",
    JSON.stringify({ data: legacy, version: 0 }),
  );
  const restored = readDraft(storage, "guest")!.data;
  assert.equal(restored.tariffs[0].snoeeKwh, "");
  assert.equal(restored.history[0].tariff.snoeeKwh, "");
  assert.equal(restored.bills[0].breakdown!.snoee, "0");
});

test("invoice reconstruction recovers separate SNOEE without absorbing it into energy", () => {
  const derived = tariffFromInvoiceAmounts(tariff, profile, {
    snoeeKwh: "0,75",
    energyPeak: "20",
  });
  assert.equal(derived.snoeeKwh, "0.003");
  assert.equal(derived.energyPeak, "0.2");
  assert.equal(calculate(derived, profile)!.total, 53.85);
  assert.equal(
    tariffFromInvoiceAmounts(tariff, profile, {
      snoeeKwh: "",
      energyPeak: "21",
    }).snoeeKwh,
    tariff.snoeeKwh,
  );
  assert.equal(
    tariffFromInvoiceAmounts(tariff, profile, { snoeeKwh: "0" }).snoeeKwh,
    "0",
  );
  for (const amounts of [{ snoeeKwh: "-1" }, { snoeeKwh: "NaN" }])
    assert.throws(
      () => tariffFromInvoiceAmounts(tariff, profile, amounts),
      /importe/,
    );
});

test("invoice reconstruction requires complete, positive total consumption and applies atomically", () => {
  for (const p of [
    { ...profile, flatKwh: "" },
    { ...profile, flatKwh: "0," },
    { ...profile, peakKwh: "0", flatKwh: "0", valleyKwh: "0" },
  ]) {
    const before = structuredClone(tariff);
    assert.throws(
      () =>
        tariffFromInvoiceAmounts(tariff, p, {
          socialDay: "1",
          snoeeKwh: "0.75",
        }),
      /consumo/,
    );
    assert.deepEqual(tariff, before);
  }
  const bill = billFromCalculation(
    tariff,
    profile,
    calculate(tariff, profile)!,
  );
  assert.ok(
    billSchema.safeParse({ ...bill, kwh: "", consumption: null, profile: null })
      .success,
    "an actual bill amount can be recorded without knowing its consumption",
  );
});
