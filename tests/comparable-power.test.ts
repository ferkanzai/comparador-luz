import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/lib/calculator";
import {
  comparablePowerPrice,
  emptyWorkspace,
  formatPowerPrice,
  newTariff,
  powerDescription,
  type Tariff,
} from "../src/lib/domain";

test("equivalent quotes compare equally across structures and all time units", () => {
  const quotes: Pick<Tariff, "powerUnit" | "powerPeak" | "powerValley">[] = [
    { powerUnit: "day", powerPeak: "0.08", powerValley: "0.02" },
    { powerUnit: "month", powerPeak: "2.4", powerValley: "0.6" },
    { powerUnit: "year", powerPeak: "29.2", powerValley: "7.3" },
  ];
  const combined = ["0.1", "3", "36.5"];
  const shared = ["0.05", "1.5", "18.25"];
  for (const [index, quote] of quotes.entries()) {
    const tariffs: Tariff[] = [
      { ...newTariff(), ...quote, powerKind: "periods" },
      {
        ...newTariff(),
        ...quote,
        powerKind: "combined",
        powerPeak: combined[index],
      },
      { ...newTariff(), ...quote, powerKind: "same", powerPeak: shared[index] },
    ];
    for (const tariff of tariffs) {
      assert.ok(Math.abs(comparablePowerPrice(tariff, "day")! - 0.1) < 1e-12);
      assert.ok(Math.abs(comparablePowerPrice(tariff, "month")! - 3) < 1e-12);
      assert.ok(Math.abs(comparablePowerPrice(tariff, "year")! - 36.5) < 1e-12);
    }
  }
});

test("a shared price is charged twice, while a combined price is counted once", () => {
  const tariff = {
    ...newTariff(),
    powerUnit: "day" as const,
    powerPeak: "0,10",
  };
  assert.equal(
    comparablePowerPrice({ ...tariff, powerKind: "same" }, "day"),
    0.2,
  );
  assert.equal(
    comparablePowerPrice({ ...tariff, powerKind: "combined" }, "day"),
    0.1,
  );
});

test("missing required power prices are unavailable, but explicit zero is valid", () => {
  const tariff = { ...newTariff(), powerPeak: "0", powerValley: "0" };
  for (const powerKind of ["periods", "same", "combined"] as const) {
    assert.equal(comparablePowerPrice({ ...tariff, powerKind }, "day"), 0);
    assert.equal(
      comparablePowerPrice({ ...tariff, powerKind, powerPeak: "" }, "day"),
      null,
    );
    assert.equal(
      comparablePowerPrice({ ...tariff, powerKind, powerValley: "" }, "day"),
      powerKind === "periods" ? null : 0,
    );
  }
});

test("a power reference remains available without energy prices", () => {
  const tariff: Tariff = {
    ...newTariff(),
    powerKind: "periods",
    powerUnit: "day",
    powerPeak: "0,08",
    powerValley: "0,02",
    energyPeak: "",
    energyFlat: "",
    energyValley: "",
  };
  assert.equal(comparablePowerPrice(tariff, "day"), 0.1);
});

test("unit prices retain precision until final formatting", () => {
  const tariff: Tariff = {
    ...newTariff(),
    powerKind: "combined",
    powerUnit: "year",
    powerPeak: "36.5123456789",
  };
  assert.equal(
    formatPowerPrice(comparablePowerPrice(tariff, "day")),
    "0,100034",
  );
  assert.equal(
    formatPowerPrice(comparablePowerPrice(tariff, "month")),
    "3,001015",
  );
  assert.equal(formatPowerPrice(3), "3");
  assert.equal(formatPowerPrice(0), "0");
  assert.equal(formatPowerPrice(null), "—");
  assert.equal(
    powerDescription(tariff),
    "36,5123456789 €/kW/año · P1 + P2 combinados",
  );
});

test("display conversions preserve quotes and actual unequal-power calculations", () => {
  const tariff: Tariff = {
    ...newTariff(),
    name: "Power comparison regression",
    kind: "fixed",
    energyPeak: "0.15",
    powerKind: "periods",
    powerUnit: "day",
    powerPeak: "0.08",
    powerValley: "0.02",
  };
  const profile = {
    ...emptyWorkspace().profile,
    days: "30",
    peakKw: "3",
    valleyKw: "6",
    peakKwh: "100",
    flatKwh: "100",
    valleyKwh: "100",
  };
  const original = structuredClone(tariff);
  const before = calculate(tariff, profile);
  for (const unit of ["day", "month", "year"] as const)
    comparablePowerPrice(tariff, unit);
  assert.deepEqual(tariff, original);
  assert.deepEqual(calculate(tariff, profile), before);
  assert.equal(before?.power, 10.8);
  const combined: Tariff = {
    ...tariff,
    powerKind: "combined",
    powerPeak: "0.1",
  };
  assert.equal(comparablePowerPrice(combined, "day"), 0.1);
  assert.equal(calculate(combined, profile), null);
});
