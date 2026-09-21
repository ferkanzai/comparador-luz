import { test } from "node:test";
import assert from "node:assert/strict";
import {
  billSchema,
  emptyWorkspace,
  newTariff,
  workspaceSchema,
  type Bill,
} from "../src/lib/domain";
import { billFromCalculation } from "../src/lib/bill-data";
import { calculate } from "../src/lib/calculator";
import {
  billConsumption,
  consumptionMonths,
  updateBillConsumption,
} from "../src/lib/bill-consumption";
import {
  billCheckSignature,
  checkBillTariff,
  invoiceProfile,
} from "../src/lib/bill-tariff-check";

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

test("itemized tariff checks ignore tax rate differences and use invoice dates and consumption", () => {
  const { bill, workspace } = fixture();
  const original = checkBillTariff(bill, workspace)!;
  assert.equal(original.mismatch, false);
  assert.equal(original.preTax, true);
  const historical = {
    ...bill,
    profile: {
      ...bill.profile!,
      days: "1",
      vat: "10",
      electricityTax: "0.5",
      peakKwh: "999",
    },
  };
  assert.equal(invoiceProfile(historical)!.days, "30");
  assert.equal(invoiceProfile(historical)!.peakKwh, "100");
  assert.equal(
    checkBillTariff(historical, workspace)!.expected,
    original.expected,
  );
  assert.equal(checkBillTariff({ ...bill, profile: null }, workspace), null);
  assert.equal(checkBillTariff({ ...bill, periodEnd: "" }, workspace), null);
});

test("total-only checks apply saved taxes and credits; fixed tariffs need no invented period split", () => {
  const { bill, workspace } = fixture();
  const totalOnly = {
    ...bill,
    breakdown: null,
    paid: String(Number(bill.paid) - 10),
    credit: "10",
  };
  assert.equal(checkBillTariff(totalOnly, workspace)!.difference, 0);
  const reduced = {
    ...totalOnly,
    profile: { ...bill.profile!, vat: "10", electricityTax: "0.5" },
  };
  assert.ok(
    checkBillTariff(reduced, workspace)!.expected <
      checkBillTariff(totalOnly, workspace)!.expected,
  );
  assert.equal(
    checkBillTariff(
      { ...totalOnly, profile: { ...bill.profile!, vat: "" } },
      workspace,
    ),
    null,
  );
  assert.equal(
    checkBillTariff({ ...totalOnly, consumption: null }, workspace),
    null,
  );
  const fixed = {
    ...totalOnly,
    consumption: null,
    tariff: { ...bill.tariff!, kind: "fixed" as const },
  };
  assert.ok(checkBillTariff(fixed, workspace));
  assert.equal(fixed.consumption, null);
  assert.equal(checkBillTariff({ ...fixed, kwh: "" }, workspace), null);
});

test("warnings tolerate rounding, suggest closer saved/history prices and do not guess through split prices", () => {
  const { bill, tariff, workspace } = fixture();
  const wrong = {
    ...bill,
    tariff: {
      ...tariff,
      id: crypto.randomUUID(),
      name: "Otra",
      energyPeak: "0.6",
    },
  };
  const check = checkBillTariff(wrong, workspace)!;
  assert.equal(check.mismatch, true);
  assert.equal(check.suggestions[0].tariff.id, tariff.id);
  assert.equal(check.suggestions[0].gap, 0);
  const history = {
    ...workspace,
    tariffs: [],
    history: [
      {
        id: crypto.randomUUID(),
        start: "2026-01-01",
        end: "2026-07-15",
        tariff,
      },
    ],
  };
  assert.equal(checkBillTariff(wrong, history)!.suggestions.length, 1);
  assert.equal(
    checkBillTariff(wrong, {
      ...history,
      history: [{ ...history.history[0], end: "2026-07-01" }],
    })!.suggestions.length,
    0,
  );
  const split: Bill = {
    ...wrong,
    priceLines: [
      {
        id: crypto.randomUUID(),
        concept: "energy",
        label: "P1",
        start: "",
        end: "",
        quantity: "",
        unit: "kwh",
        price: "",
        amount: "37",
      },
    ],
  };
  assert.equal(checkBillTariff(split, workspace)!.suggestions.length, 0);
  assert.equal(checkBillTariff(split, workspace)!.splitPrices, true);
  const withSocial = {
    ...split,
    priceLines: [
      { ...split.priceLines[0], concept: "social" as const, amount: "0.75" },
    ],
  };
  assert.equal(checkBillTariff(withSocial, workspace)!.suggestions.length, 1);
  const nearby = {
    ...bill,
    breakdown: null,
    paid: String(Number(bill.paid) + 1),
  };
  assert.equal(checkBillTariff(nearby, workspace)!.mismatch, false);
});

test("acknowledgements persist without blocking mismatches and invalidate when relevant inputs change", () => {
  const { bill, workspace } = fixture();
  const wrong = { ...bill, tariff: { ...bill.tariff!, energyPeak: "0.9" } };
  const signature = billCheckSignature(wrong);
  const accepted = billSchema.parse({
    ...wrong,
    tariffReview: { signature, reason: "He comprobado el contrato" },
  });
  assert.equal(checkBillTariff(accepted, workspace)!.mismatch, true);
  assert.equal(billCheckSignature(accepted), signature);
  assert.equal(
    billCheckSignature({ ...accepted, notes: "Personal note" }),
    signature,
  );
  assert.notEqual(billCheckSignature({ ...accepted, paid: "50" }), signature);
  assert.notEqual(
    billCheckSignature({ ...accepted, tariff: bill.tariff }),
    signature,
  );
});
