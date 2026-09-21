import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/lib/calculator";
import {
  changeCurrent,
  emptyWorkspace,
  newTariff,
  powerDayFactor,
  powerDescription,
  tariffSchema,
  workspaceSchema,
} from "../src/lib/domain";
import {
  estimateMeter,
  estimateSocial,
  estimatedCharges,
} from "../src/lib/charge-estimates";
const profile = {
  ...emptyWorkspace().profile,
  days: "30",
  peakKwh: "100",
  flatKwh: "100",
  valleyKwh: "100",
  peakKw: "4",
  valleyKw: "4",
};
const tariff = {
  ...newTariff(),
  name: "Test",
  energyPeak: "0.2",
  energyFlat: "0.15",
  energyValley: "0.1",
  powerPeak: "0.1",
  powerValley: "0.03",
};
test("period energy and power use all five prices and actual billing days", () => {
  const cost = calculate(tariff, profile)!;
  assert.equal(cost.energy, 45);
  assert.equal(cost.power, 15.6);
  assert.equal(cost.total, 60.6);
});
test("fixed price uses the total consumption regardless of period prices", () => {
  assert.equal(
    calculate(
      {
        ...tariff,
        kind: "fixed",
        energyPeak: "0.12",
        energyFlat: "",
        energyValley: "",
      },
      profile,
    )!.energy,
    36,
  );
});
test("annual power prices convert to daily without multiplying by months", () => {
  assert.equal(
    calculate(
      { ...tariff, powerUnit: "year", powerPeak: "36.5", powerValley: "10.95" },
      profile,
    )!.power,
    15.6,
  );
});
test("Spanish commas work and incomplete input never produces a cheapest zero bill", () => {
  assert.equal(
    calculate({ ...tariff, energyPeak: "0,2" }, profile)!.total,
    60.6,
  );
  for (const days of ["", "0", "-1", "1.5", "NaN", "Infinity", "999"])
    assert.equal(calculate(tariff, { ...profile, days }), null);
  assert.equal(calculate({ ...tariff, powerPeak: "" }, profile), null);
  assert.equal(calculate(tariff, { ...profile, peakKwh: "" }), null);
  assert.equal(calculate(tariff, { ...profile, peakKw: "16" }), null);
});
test("electricity tax includes social financing but excludes meter and services; IVA includes IEE", () => {
  const cost = calculate(
    { ...tariff, socialDay: "0.04", meterDay: "0.03", servicesMonth: "10" },
    { ...profile, taxes: true, vat: "21", electricityTax: "5.11269632" },
  )!;
  assert.equal(cost.social, 1.2);
  assert.equal(cost.electricityBase, 61.8);
  assert.equal(cost.electricityTax, 3.16);
  assert.equal(cost.meter, 0.9);
  assert.equal(cost.vatBase, 65.86);
  assert.equal(cost.vat, 13.83);
  assert.equal(cost.services, 9.86);
  assert.equal(cost.servicesVat, 2.07);
  assert.equal(cost.total, 91.62);
});
test("reduced supply IVA does not reduce IVA on independent services", () => {
  const cost = calculate(
    { ...tariff, servicesMonth: "10" },
    { ...profile, taxes: true, vat: "10", electricityTax: "0.5" },
  )!;
  assert.equal(cost.vat, 6.09);
  assert.equal(cost.servicesVat, 2.07);
});
test("minimum domestic IEE is one euro per MWh and can be disabled for exempt cases", () => {
  const t = {
    ...tariff,
    energyPeak: "0",
    energyFlat: "0",
    energyValley: "0",
    powerPeak: "0",
    powerValley: "0",
  };
  const p = { ...profile, taxes: true, electricityTax: "0.5", vat: "21" };
  assert.equal(calculate(t, p)!.electricityTax, 0.3);
  assert.equal(calculate(t, { ...p, minimumTax: false })!.electricityTax, 0);
});
test("tax toggle retains all non-tax charges and never charges taxes when disabled", () => {
  const cost = calculate(
    { ...tariff, socialDay: "0.04", meterDay: "0.03", servicesMonth: "10" },
    profile,
  )!;
  assert.equal(cost.total, 72.56);
  assert.equal(cost.electricityTax, 0);
  assert.equal(cost.vat, 0);
  assert.equal(cost.servicesVat, 0);
  assert.equal(calculate(tariff, { ...profile, taxes: true }), null);
});
test("changing provider preserves a deep copy of previous prices and valid dates", () => {
  const next = { ...tariff, id: crypto.randomUUID(), name: "Next" };
  const w = {
    ...emptyWorkspace(),
    tariffs: [tariff, next],
    currentId: tariff.id,
    currentSince: "2025-01-01",
  };
  const changed = changeCurrent(w, next.id, "2025-02-01");
  assert.equal(changed.currentId, next.id);
  assert.equal(changed.history.length, 1);
  assert.equal(changed.history[0].tariff.energyPeak, "0.2");
  assert.notEqual(changed.history[0].tariff, tariff);
  assert.throws(() => changeCurrent(w, next.id, "2024-01-01"));
  assert.throws(() => changeCurrent(w, next.id, "2099-01-01"));
  assert.throws(() => changeCurrent(w, crypto.randomUUID(), "2025-02-01"));
});
test("workspace rejects unsafe URLs, invalid dates, duplicate ids, and broken current references", () => {
  assert.equal(
    workspaceSchema.safeParse({
      ...emptyWorkspace(),
      tariffs: [{ ...tariff, url: "javascript:alert(1)" }],
    }).success,
    false,
  );
  assert.equal(
    workspaceSchema.safeParse({
      ...emptyWorkspace(),
      tariffs: [{ ...tariff, checkedOn: "2025-02-31" }],
    }).success,
    false,
  );
  assert.equal(
    workspaceSchema.safeParse({
      ...emptyWorkspace(),
      tariffs: [tariff, tariff],
    }).success,
    false,
  );
  assert.equal(
    workspaceSchema.safeParse({ ...emptyWorkspace(), currentId: tariff.id })
      .success,
    false,
  );
});
test("unified power prices distinguish per-period prices from a combined charge", () => {
  assert.equal(
    calculate(
      { ...tariff, powerKind: "same", powerPeak: "0.05", powerValley: "" },
      profile,
    )!.power,
    12,
  );
  assert.equal(
    calculate(
      { ...tariff, powerKind: "combined", powerPeak: "0.1", powerValley: "" },
      profile,
    )!.power,
    12,
  );
  assert.equal(
    calculate(
      { ...tariff, powerKind: "combined", powerPeak: "0.1" },
      { ...profile, valleyKw: "5" },
    ),
    null,
  );
  assert.equal(
    calculate(
      {
        ...tariff,
        powerKind: "combined",
        powerPeak: "36.5",
        powerUnit: "year",
      },
      profile,
    )!.power,
    12,
  );
});
test("reported invoice can be reproduced from billed amounts without inventing a rounding adjustment", () => {
  const p = {
    ...profile,
    days: "29",
    peakKwh: "10",
    flatKwh: "10",
    valleyKwh: "23",
    taxes: true,
    vat: "21",
    electricityTax: "5.11269632",
  };
  const printed = {
    ...tariff,
    energyPeak: "0.192",
    energyFlat: "0.113",
    energyValley: "0.082",
    powerPeak: "0.097",
    powerValley: "0.027",
    socialDay: "0.025",
    meterDay: "0.027",
  };
  assert.equal(calculate(printed, p)!.total, 26.45);
  const effective = (amount: number, quantity: number) =>
    String(Number((amount / quantity).toFixed(12)));
  const fromBill = {
    ...printed,
    energyPeak: effective(1.91, 10),
    energyFlat: effective(1.13, 10),
    energyValley: effective(1.88, 23),
    powerPeak: effective(11.25, 4 * 29),
    powerValley: effective(3.13, 4 * 29),
    socialDay: effective(0.72, 29),
    meterDay: effective(0.77, 29),
    socialInElectricityTax: false,
  };
  const got = calculate(fromBill, p)!;
  assert.deepEqual(
    [
      got.power,
      got.energy,
      got.social,
      got.meter,
      got.electricityTax,
      got.vat,
      got.total,
    ],
    [14.38, 4.92, 0.72, 0.77, 0.99, 4.57, 26.35],
  );
  assert.equal(
    calculate({ ...fromBill, socialInElectricityTax: true }, p)!.electricityTax,
    1.02,
  );
  assert.equal(calculate(fromBill, { ...p, taxes: false })!.total, 20.79);
});

test("a total monthly power price is charged once and prorated over 30 days", () => {
  const monthly = {
    ...tariff,
    powerUnit: "month" as const,
    powerKind: "combined" as const,
    powerPeak: "7,20",
    powerValley: "",
  };
  for (const [days, expected] of [
    [29, 27.84],
    [30, 28.8],
    [31, 29.76],
    [60, 57.6],
  ]) {
    assert.equal(
      calculate(monthly, { ...profile, days: String(days) })!.power,
      expected,
    );
  }
  // An explicitly per-period price still charges both contracted powers.
  assert.equal(
    calculate({ ...monthly, powerKind: "same" }, { ...profile, days: "29" })!
      .power,
    55.68,
  );
  assert.equal(calculate(monthly, { ...profile, valleyKw: "5" }), null);
});

test("monthly power uses 30-day proration in all price modes and invoice reconstruction", () => {
  for (const days of [28, 29, 30, 31, 60, 365]) {
    for (const powerKind of ["periods", "same", "combined"] as const) {
      const monthly = {
        ...tariff,
        powerUnit: "month" as const,
        powerKind,
        powerPeak: "3,60",
        powerValley: "0.90",
      };
      const daily = {
        ...monthly,
        powerUnit: "day" as const,
        powerPeak: "0.12",
        powerValley: "0.03",
      };
      assert.equal(
        calculate(monthly, { ...profile, days: String(days) })!.power,
        calculate(daily, { ...profile, days: String(days) })!.power,
      );
      assert.match(powerDescription(monthly), /€\/kW\/mes/);
    }
  }
  const p = { ...profile, days: "29", valleyKw: "5" };
  const fromAmounts = {
    ...tariff,
    powerUnit: "month" as const,
    powerPeak: (11.25 / ((4 * 29) / 30)).toFixed(12),
    powerValley: (3.13 / ((5 * 29) / 30)).toFixed(12),
  };
  assert.equal(powerDayFactor("month"), 1 / 30);
  assert.equal(calculate(fromAmounts, p)!.power, 14.38);
  assert.equal(calculate({ ...fromAmounts, powerKind: "combined" }, p), null);
});

test("opt-in estimates use dated pre-tax references and survive workspace snapshots", () => {
  assert.equal(estimatedCharges(tariff), "");
  assert.equal(calculate(tariff, profile)!.meter, 0);
  const t = estimateSocial(estimateMeter(tariff, "single-2013"));
  assert.equal(estimatedCharges(t), "alquiler y bono social");
  assert.equal(calculate(t, profile)!.meter, 0.8);
  assert.equal(calculate(t, profile)!.social, 0.74);
  const year = calculate(t, { ...profile, days: "365" })!;
  assert.equal(year.meter, 9.72);
  assert.equal(year.social, 9.01);
  assert.equal(
    calculate(estimateMeter(t, "three-2013"), { ...profile, days: "365" })!
      .meter,
    16.32,
  );
  const next = { ...tariff, id: crypto.randomUUID() };
  const changed = changeCurrent(
    {
      ...emptyWorkspace(),
      tariffs: [t, next],
      currentId: t.id,
      currentSince: "2026-07-01",
    },
    next.id,
    "2026-09-01",
  );
  const restored = workspaceSchema.parse(JSON.parse(JSON.stringify(changed)));
  assert.equal(restored.history[0].tariff.socialEstimate, "ted634-2026");
  assert.equal(restored.history[0].tariff.meterEstimate, "single-2013");
  assert.equal(restored.history[0].tariff.socialDay, t.socialDay);
  const legacy = tariffSchema.parse({
    ...tariff,
    meterEstimate: undefined,
    socialEstimate: undefined,
  });
  assert.equal(legacy.meterEstimate, "none");
  assert.equal(legacy.socialEstimate, "none");
});
