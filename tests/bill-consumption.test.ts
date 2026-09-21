import { test } from "node:test";
import assert from "node:assert/strict";
import {
  billSchema,
  emptyWorkspace,
  newTariff,
  workspaceSchema,
} from "../src/lib/domain";
import { billFromCalculation } from "../src/lib/bill-data";
import { calculate } from "../src/lib/calculator";
import {
  billConsumption,
  consumptionMonths,
  updateBillConsumption,
} from "../src/lib/bill-consumption";
import { invoiceProfile, newInvoiceProfile } from "../src/lib/invoice-profile";

function fixture() {
  const profile = {
    ...emptyWorkspace().profile,
    days: "30",
    peakKwh: "100",
    flatKwh: "50",
    valleyKwh: "150",
    peakKw: "4",
    valleyKw: "4",
    taxes: true,
    vat: "21",
    electricityTax: "5.11269632",
  };
  const tariff = {
    ...newTariff(),
    name: "Contrato",
    kind: "periods" as const,
    energyPeak: "0.2",
    energyFlat: "0.1",
    energyValley: "0.08",
    powerPeak: "0.1",
    powerValley: "0.02",
    socialDay: "0.025",
    meterDay: "0.03",
  };
  const bill = {
    ...billFromCalculation(tariff, profile, calculate(tariff, profile)!),
    month: "2026-07",
    periodStart: "2026-06-15",
    periodEnd: "2026-07-15",
  };
  return {
    profile,
    tariff,
    bill,
    workspace: { ...emptyWorkspace(), tariffs: [tariff], bills: [bill] },
  };
}

test("optional period consumption sums commas and zeroes, validates totals and survives workspace roundtrip", () => {
  const { bill, workspace } = fixture();
  const changed = updateBillConsumption(bill, {
    peakKwh: "10,25",
    flatKwh: "0",
    valleyKwh: "20.125",
  });
  assert.equal(changed.kwh, "30.375");
  const restored = workspaceSchema.parse(
    JSON.parse(JSON.stringify({ ...workspace, bills: [changed] })),
  );
  assert.deepEqual(restored.bills[0].consumption, changed.consumption);
  assert.equal(billSchema.safeParse({ ...changed, kwh: "31" }).success, false);
  const incomplete = updateBillConsumption(bill, {
    peakKwh: "10",
    flatKwh: "",
    valleyKwh: "20",
  });
  assert.equal(incomplete.kwh, "");
  assert.equal(billSchema.safeParse(incomplete).success, false);
  assert.equal(
    billSchema.safeParse(updateBillConsumption(changed, null)).success,
    true,
  );
});

test("legacy snapshots only supply a period split when they match the recorded total", () => {
  const { bill } = fixture();
  const legacy = { ...bill, consumption: undefined };
  assert.deepEqual(billConsumption(legacy), bill.consumption);
  assert.equal(billConsumption({ ...legacy, kwh: "99" }), null);
  assert.equal(billConsumption({ ...legacy, kwh: "" }), null);
  assert.equal(billConsumption({ ...legacy, consumption: null }), null);
});

test("monthly consumption combines invoices, preserves total-only data and distinguishes missing from zero", () => {
  const { bill } = fixture();
  const bills = [
    bill,
    { ...bill, id: crypto.randomUUID(), consumption: null, kwh: "40" },
    { ...bill, id: crypto.randomUUID(), consumption: null, kwh: "" },
    { ...bill, month: "2026-08", consumption: null, kwh: "0" },
    { ...bill, month: "2025-07" },
  ];
  const months = consumptionMonths(bills, "2026");
  assert.deepEqual(months[6].totals, {
    peakKwh: 100,
    flatKwh: 50,
    valleyKwh: 150,
    unallocated: 40,
  });
  assert.equal(months[6].total, 340);
  assert.equal(months[6].recorded, 2);
  assert.equal(months[6].missing, 1);
  assert.equal(months[7].total, 0);
  assert.equal(months[7].recorded, 1);
  assert.equal(months[5].total, null); // The invoice starts in June but is reported in July.
});

test("invoice profiles use invoice dates and consumption instead of the original calculator copy", () => {
  const { bill } = fixture();
  const historical = {
    ...bill,
    profile: { ...bill.profile!, days: "1", peakKwh: "999" },
  };
  assert.equal(invoiceProfile(historical)!.days, "30");
  assert.equal(invoiceProfile(historical)!.peakKwh, "100");
  assert.equal(invoiceProfile({ ...bill, profile: null }), null);
  assert.equal(invoiceProfile({ ...bill, periodEnd: "" }), null);
  const fresh = newInvoiceProfile({ ...bill, profile: null });
  assert.equal(fresh.days, "30");
  assert.equal(fresh.peakKwh, "100");
});

test("existing tariff review metadata remains readable after retiring automatic checks", () => {
  const { bill } = fixture();
  const review = {
    signature: "v1:legacy",
    reason: "He comprobado el contrato",
  };
  const saved = billSchema.parse({ ...bill, tariffReview: review });
  assert.deepEqual(saved.tariffReview, review);
});
