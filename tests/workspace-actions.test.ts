import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  newTariff,
  workspaceLimits,
  workspaceSchema,
  type Workspace,
} from "../src/lib/domain";
import { calculate } from "../src/lib/calculator";
import { billFromCalculation } from "../src/lib/bill-data";
import {
  adoptSimulation,
  canAddTariff,
  duplicateTariff,
  removeBill,
  removeTariff,
  saveBill,
  saveTariff,
  updateProfile,
} from "../src/lib/workspace-actions";

const profile = {
  ...emptyWorkspace().profile,
  days: "30",
  peakKwh: "100",
  flatKwh: "80",
  valleyKwh: "120",
  peakKw: "4",
  valleyKw: "4",
};

const tariff = (name = "Oferta") => ({
  ...newTariff(),
  name,
  energyPeak: "0.15",
  energyFlat: "0.12",
  energyValley: "0.08",
  powerPeak: "0.1",
  powerValley: "0.03",
});

function bill(month = "2026-03") {
  const t = tariff("Contrato");
  return { ...billFromCalculation(t, profile, calculate(t, profile)!), month };
}

function fullOfTariffs(): Workspace {
  return {
    ...emptyWorkspace(),
    tariffs: Array.from({ length: workspaceLimits.tariffs }, () => tariff()),
  };
}

test("saveTariff appends new offers, replaces edited ones and applies the profile", () => {
  const first = tariff("Primera");
  const added = saveTariff(emptyWorkspace(), first, {
    since: "",
    profile,
    makeCurrent: false,
  });
  assert.deepEqual(
    added.tariffs.map((t) => t.name),
    ["Primera"],
  );
  assert.equal(added.profile, profile);
  assert.equal(added.currentId, null);
  const edited = saveTariff(
    added,
    { ...first, name: "Renombrada" },
    { since: "", profile, makeCurrent: false },
  );
  assert.deepEqual(
    edited.tariffs.map((t) => t.name),
    ["Renombrada"],
  );
});

test("saveTariff records the first current tariff with its start date", () => {
  const next = saveTariff(emptyWorkspace(), tariff("Actual"), {
    since: "2026-01-01",
    profile,
    makeCurrent: true,
  });
  assert.equal(next.tariffs.length, 1);
  assert.equal(next.currentId, next.tariffs[0].id);
  assert.equal(next.currentSince, "2026-01-01");
  assert.ok(workspaceSchema.safeParse(next).success);
});

test("saveTariff refuses a 101st tariff but still edits at the limit", () => {
  const full = fullOfTariffs();
  assert.equal(canAddTariff(full), false);
  assert.equal(canAddTariff(emptyWorkspace()), true);
  assert.throws(
    () =>
      saveTariff(full, tariff(), { since: "", profile, makeCurrent: false }),
    /hasta 100 tarifas/,
  );
  assert.throws(
    () =>
      saveTariff(full, duplicateTariff(full.tariffs[0]), {
        since: "",
        profile,
        makeCurrent: false,
      }),
    /hasta 100 tarifas/,
  );
  assert.equal(full.tariffs.length, workspaceLimits.tariffs);
  const edited = saveTariff(
    full,
    { ...full.tariffs[0], name: "Editada" },
    { since: "", profile, makeCurrent: false },
  );
  assert.equal(edited.tariffs[0].name, "Editada");
  assert.ok(workspaceSchema.safeParse(edited).success);
});

test("duplicateTariff returns an unsaved copy with a new id and a bounded name", () => {
  const original = tariff("x".repeat(100));
  const copy = duplicateTariff(original);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.name, `${"x".repeat(92)} (copia)`);
  assert.equal(copy.energyPeak, original.energyPeak);
});

test("removeTariff drops an offer and clears the current contract when it is removed", () => {
  const w = saveTariff(emptyWorkspace(), tariff("Actual"), {
    since: "2026-01-01",
    profile,
    makeCurrent: true,
  });
  const offer = tariff("Oferta");
  const withOffer = saveTariff(w, offer, {
    since: "",
    profile,
    makeCurrent: false,
  });
  assert.deepEqual(
    removeTariff(withOffer, offer.id).tariffs.map((t) => t.name),
    ["Actual"],
  );
  const withoutCurrent = removeTariff(withOffer, w.currentId!);
  assert.equal(withoutCurrent.currentId, null);
  assert.equal(withoutCurrent.currentSince, "");
  assert.ok(workspaceSchema.safeParse(withoutCurrent).success);
});

test("saveBill inserts new bills and replaces existing ones in place", () => {
  const march = bill("2026-03");
  const april = bill("2026-04");
  const w = saveBill(saveBill(emptyWorkspace(), march), april);
  assert.deepEqual(
    w.bills.map((b) => b.month),
    ["2026-03", "2026-04"],
  );
  const corrected = saveBill(w, { ...march, paid: "99.99" });
  assert.deepEqual(
    corrected.bills.map((b) => [b.month, b.paid]),
    [
      ["2026-03", "99.99"],
      ["2026-04", april.paid],
    ],
  );
});

test("saveBill adds the invoice tariff once and respects the tariff and bill limits", () => {
  const invoiceTariff = tariff("Precios de la factura");
  const march = { ...bill(), tariff: invoiceTariff };
  const w = saveBill(emptyWorkspace(), march, invoiceTariff);
  assert.equal(w.tariffs.length, 1);
  assert.equal(saveBill(w, march, invoiceTariff).tariffs.length, 1);
  assert.throws(
    () => saveBill(fullOfTariffs(), march, invoiceTariff),
    /hasta 100 tarifas/,
  );
  const fullOfBills = {
    ...emptyWorkspace(),
    bills: Array.from({ length: workspaceLimits.bills }, () => ({
      ...march,
      id: crypto.randomUUID(),
    })),
  };
  assert.throws(() => saveBill(fullOfBills, bill()), /hasta 1200 facturas/);
  assert.equal(
    saveBill(fullOfBills, { ...fullOfBills.bills[0], notes: "Revisada" })
      .bills[0].notes,
    "Revisada",
  );
});

test("removeBill drops only the chosen bill", () => {
  const march = bill("2026-03");
  const april = bill("2026-04");
  const w = saveBill(saveBill(emptyWorkspace(), march), april);
  assert.deepEqual(
    removeBill(w, march.id).bills.map((b) => b.id),
    [april.id],
  );
});

test("updateProfile and adoptSimulation change only the profile", () => {
  const w = saveTariff(emptyWorkspace(), tariff(), {
    since: "",
    profile,
    makeCurrent: false,
  });
  const taxed = updateProfile(w, { ...profile, taxes: true });
  assert.equal(taxed.profile.taxes, true);
  assert.equal(taxed.tariffs, w.tariffs);
  const simulated = adoptSimulation(taxed, {
    peakKwh: "10",
    flatKwh: "20",
    valleyKwh: "30",
  });
  assert.deepEqual(
    [
      simulated.profile.peakKwh,
      simulated.profile.flatKwh,
      simulated.profile.valleyKwh,
    ],
    ["10", "20", "30"],
  );
  assert.equal(simulated.profile.taxes, true);
  assert.equal(simulated.profile.days, "30");
});
