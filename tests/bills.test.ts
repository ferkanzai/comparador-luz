import { test } from "node:test";
import assert from "node:assert/strict";
import {
  billSchema,
  emptyWorkspace,
  newTariff,
  workspaceSchema,
} from "../src/lib/domain";
import { calculate } from "../src/lib/calculator";
import {
  billFromCalculation,
  billBuckets,
  billTotal,
} from "../src/lib/bill-data";

test("saving a calculation preserves consumption and cost snapshots for stacked monthly history", () => {
  const p = {
    ...emptyWorkspace().profile,
    days: "30",
    peakKwh: "100",
    flatKwh: "0",
    valleyKwh: "0",
    peakKw: "4",
    valleyKw: "4",
    taxes: true,
    vat: "21",
    electricityTax: "5.11269632",
  };
  const t = {
    ...newTariff(),
    name: "Contract",
    energyPeak: "0.1",
    energyFlat: "0",
    energyValley: "0",
    powerPeak: "0.1",
    powerValley: "0.03",
    meterDay: "0.03",
  };
  const bill = billFromCalculation(t, p, calculate(t, p)!);
  assert.ok(billSchema.safeParse(bill).success);
  const buckets = billBuckets(bill);
  assert.ok(
    Math.abs(
      Object.values(buckets).reduce((a, b) => a + b, 0) - Number(bill.paid),
    ) < 0.001,
  );
  t.energyPeak = "1";
  p.peakKwh = "900";
  assert.equal(bill.tariff!.energyPeak, "0.1");
  assert.equal(bill.profile!.peakKwh, "100");
  assert.equal(bill.breakdown!.energy, "10");
  assert.equal(billSchema.safeParse({ ...bill, paid: "1" }).success, false);
});
test("existing workspaces keep old tariffs and total-only bills readable", () => {
  const t = newTariff();
  const { powerKind, socialInElectricityTax, ...oldTariff } = t;
  assert.equal(powerKind, "periods");
  assert.equal(socialInElectricityTax, true);
  const oldBill = {
    id: crypto.randomUUID(),
    month: "2026-08",
    provider: "Supplier",
    paid: "26,35",
    kwh: "43",
    notes: "",
    tariff: null,
  };
  const w = workspaceSchema.parse({
    ...emptyWorkspace(),
    tariffs: [{ ...oldTariff, name: "Existing" }],
    bills: [oldBill],
  });
  assert.equal(w.tariffs[0].powerKind, "periods");
  assert.equal(w.tariffs[0].socialInElectricityTax, true);
  assert.equal(w.bills[0].breakdown, null);
  assert.equal(billBuckets(w.bills[0]).unknown, 26.35);
});
test("bills can span calendar months and keep a separate reporting month", () => {
  const base = {
    id: crypto.randomUUID(),
    month: "2026-09",
    periodStart: "2026-08-23",
    periodEnd: "2026-09-21",
    provider: "Supplier",
    paid: "26.35",
    kwh: "43",
    notes: "",
    tariff: null,
  };
  const bill = billSchema.parse(base);
  assert.equal(bill.periodStart, "2026-08-23");
  assert.equal(bill.periodEnd, "2026-09-21");
  assert.equal(
    billSchema.safeParse({ ...base, periodEnd: "2026-08-22" }).success,
    false,
  );
  assert.equal(billSchema.safeParse({ ...base, periodEnd: "" }).success, false);
  assert.equal(
    billSchema.safeParse({ ...base, periodStart: "", periodEnd: "" }).success,
    true,
  );
});

test("credits reduce the recorded total without changing taxes and old bills default to no credit", () => {
  const raw = {
    id: crypto.randomUUID(),
    month: "2026-09",
    provider: "Provider",
    paid: "20",
    kwh: "",
    notes: "",
    tariff: null,
  };
  assert.equal(billSchema.parse(raw).credit, "0");
  const breakdown = {
    energy: "10",
    power: "10",
    social: "0",
    meter: "0",
    services: "0",
    electricityTax: "1",
    vat: "4",
    servicesVat: "0",
  };
  const bill = billSchema.parse({ ...raw, breakdown, credit: "5" });
  assert.equal(billTotal(bill), 25);
  assert.equal(billTotal(billSchema.parse(raw)), 20);
  assert.equal(billBuckets(bill).credit, -5);
  assert.equal(billBuckets(bill).taxes, 5);
  assert.equal(
    Object.values(billBuckets(bill)).reduce((a, b) => a + b, 0),
    20,
  );
  assert.equal(billSchema.safeParse({ ...bill, paid: "25" }).success, false);
  const refund = billSchema.parse({ ...bill, paid: "-5", credit: "30" });
  assert.equal(billTotal(refund), 25);
  assert.equal(
    Object.values(billBuckets(refund)).reduce((a, b) => a + b, 0),
    -5,
  );
  const noBreakdown = billSchema.parse({ ...raw, credit: "5" });
  assert.equal(billBuckets(noBreakdown).unknown, 25);
  assert.equal(
    Object.values(billBuckets(noBreakdown)).reduce((a, b) => a + b, 0),
    20,
  );
});

test("reconciliation distinguishes missing values, exact matches and credit mismatches", async () => {
  const { billReconciliation } = await import("../src/lib/bill-data");
  const bill = billSchema.parse({
    id: crypto.randomUUID(),
    month: "2026-07",
    provider: "Supplier",
    paid: "15",
    credit: "5",
    kwh: "",
    notes: "",
    tariff: null,
    breakdown: {
      energy: "20",
      power: "0",
      social: "0",
      meter: "0",
      services: "0",
      electricityTax: "0",
      vat: "0",
      servicesVat: "0",
    },
  });
  assert.deepEqual(billReconciliation(bill), {
    gross: 20,
    net: 15,
    difference: 0,
  });
  assert.equal(
    billReconciliation({ ...bill, paid: "14.99" })!.difference,
    0.01,
  );
  assert.equal(billReconciliation({ ...bill, credit: "6" })!.difference, -1);
  assert.equal(billReconciliation({ ...bill, paid: "" }), null);
  assert.equal(
    billReconciliation({
      ...bill,
      breakdown: { ...bill.breakdown!, energy: "" },
    }),
    null,
  );
});
