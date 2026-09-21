import { test } from "node:test";
import assert from "node:assert/strict";
import { billSchema } from "../src/lib/domain";
import {
  compareYears,
  invoiceYears,
  yearSeries,
} from "../src/lib/year-comparison";
const bill = (month: string, paid: string, kwh = "", credit = "0") =>
  billSchema.parse({
    id: crypto.randomUUID(),
    month,
    paid,
    kwh,
    credit,
    provider: "Supplier",
    notes: "",
    tariff: null,
  });

test("annual totals compare only shared reporting months, aggregate bills and retain negative credits", () => {
  const bills = [
    bill("2024-01", "20"),
    bill("2024-01", "30"),
    bill("2024-02", "500"),
    bill("2025-01", "45"),
    bill("2024-03", "0"),
    bill("2025-03", "-5", "", "10"),
    bill("2026-02", "10"),
  ];
  assert.deepEqual(invoiceYears(bills), ["2026", "2025", "2024"]);
  const result = compareYears(bills, "2024", "2025", "paid");
  assert.equal(result.commonMonths, 2);
  assert.equal(result.firstTotal, 50);
  assert.equal(result.secondTotal, 40);
  assert.equal(result.difference, -10);
  assert.equal(result.percent, -20);
  assert.equal(result.rows[1].second.value, null);
  assert.equal(result.rows[1].difference, null);
  assert.equal(result.rows[2].difference, -5);
  assert.equal(result.rows[0].first.count, 2);
});

test("partial consumption is displayed but excluded from annual differences; zero is known data", () => {
  const bills = [
    bill("2024-01", "20", "100"),
    bill("2025-01", "30", "80"),
    bill("2025-01", "20"),
    bill("2024-02", "20", "0"),
    bill("2025-02", "20", "0"),
    bill("2024-03", "20", "50.5"),
    bill("2025-03", "20", "60,5"),
  ];
  const result = compareYears(bills, "2024", "2025", "consumption");
  assert.equal(result.rows[0].second.value, 80);
  assert.equal(result.rows[0].second.missing, 1);
  assert.equal(result.rows[0].difference, null);
  assert.equal(result.commonMonths, 2);
  assert.equal(result.firstTotal, 50.5);
  assert.equal(result.secondTotal, 60.5);
  assert.equal(result.difference, 10);
  assert.equal(result.rows[1].difference, 0);
});

test("missing shared months and nonpositive baselines never invent a percentage", () => {
  const missing = compareYears(
    [bill("2024-01", "10"), bill("2025-02", "20")],
    "2024",
    "2025",
    "paid",
  );
  assert.equal(missing.commonMonths, 0);
  assert.equal(missing.percent, null);
  assert.equal(
    yearSeries([], "2024", "consumption").every((m) => m.value === null),
    true,
  );
  const zero = compareYears(
    [bill("2024-01", "0"), bill("2025-01", "10")],
    "2024",
    "2025",
    "paid",
  );
  assert.equal(zero.difference, 10);
  assert.equal(zero.percent, null);
  const negative = compareYears(
    [bill("2024-01", "-5", "", "5"), bill("2025-01", "10")],
    "2024",
    "2025",
    "paid",
  );
  assert.equal(negative.percent, null);
});
