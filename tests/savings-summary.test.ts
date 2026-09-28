import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/lib/calculator";
import { emptyWorkspace, newTariff, type Tariff } from "../src/lib/domain";
import { estimateMeter } from "../src/lib/charge-estimates";
import { annualize, summarizeSavings } from "../src/lib/savings-summary";

const profile = {
  ...emptyWorkspace().profile,
  days: "73",
  peakKwh: "100",
  flatKwh: "100",
  valleyKwh: "100",
  peakKw: "0",
  valleyKw: "0",
};
/** A tariff whose estimated period cost is 300 kWh at `price`. */
const tariff = (name: string, price: string): Tariff => ({
  ...newTariff(),
  name,
  energyPeak: price,
  energyFlat: price,
  energyValley: price,
  powerPeak: "0",
  powerValley: "0",
});
/** Rows as the ranking orders them: cheapest first, unpriced last. */
const rank = (...tariffs: Tariff[]) =>
  tariffs
    .map((t) => ({ tariff: t, cost: calculate(t, profile) }))
    .sort((a, b) => (a.cost?.total ?? Infinity) - (b.cost?.total ?? Infinity));

const cheap = tariff("Barata", "0.1"); // 30 €
const middle = tariff("Media", "0.15"); // 45 €
const dear = tariff("Cara", "0.2"); // 60 €

test("annualizes a period amount at the same daily rate", () => {
  assert.equal(annualize(10, 73), 50);
  assert.equal(annualize(-30, 30), -365);
});

test("measures the saving from the current tariff to the cheapest", () => {
  const summary = summarizeSavings(rank(dear, cheap, middle), dear.id)!;
  assert.equal(summary.kind, "switch");
  assert.equal(summary.reference.tariff, dear);
  assert.equal(summary.best.tariff, cheap);
  assert.equal(summary.difference, 30);
  assert.equal(summary.share, 0.5);
  assert.equal(summary.days, 73);
  assert.deepEqual(
    summary.ranking.map((row) => [row.tariff.name, row.yearly]),
    [
      ["Barata", -150],
      ["Media", -75],
      ["Cara", 0],
    ],
  );
});

test("when the current tariff is cheapest, measures the gap to the next", () => {
  const summary = summarizeSavings(rank(middle, cheap, dear), cheap.id)!;
  assert.equal(summary.kind, "current-cheapest");
  assert.equal(summary.reference.tariff, cheap);
  assert.equal(summary.runnerUp.tariff, middle);
  assert.equal(summary.difference, 15);
  assert.equal(summary.share, 0.5);
});

test("a current tariff tied with the cheapest has no saving to switch", () => {
  const twin = tariff("Gemela", "0.1");
  const summary = summarizeSavings(rank(twin, cheap), cheap.id)!;
  assert.equal(summary.kind, "current-cheapest");
  assert.equal(summary.difference, 0);
});

test("without a priced current tariff, differences start from the cheapest", () => {
  for (const currentId of [null, tariff("Incompleta", "").id]) {
    const summary = summarizeSavings(rank(dear, cheap), currentId)!;
    assert.equal(summary.kind, "no-current");
    assert.equal(summary.reference.tariff, cheap);
    assert.equal(summary.runnerUp.tariff, dear);
    assert.equal(summary.difference, 30);
    assert.deepEqual(
      summary.ranking.map((row) => row.yearly),
      [0, 150],
    );
  }
});

test("needs two priced tariffs to give an answer", () => {
  assert.equal(summarizeSavings(rank(cheap), cheap.id), null);
  assert.equal(
    summarizeSavings(rank(cheap, tariff("Incompleta", "")), cheap.id),
    null,
  );
});

test("flags estimated charges only on the tariffs the answer compares", () => {
  const estimated = estimateMeter(middle, "single-2013");
  const other = rank(dear, cheap, estimated);
  assert.equal(summarizeSavings(other, dear.id)!.estimated, false);
  assert.equal(summarizeSavings(other, estimated.id)!.estimated, true);
});
