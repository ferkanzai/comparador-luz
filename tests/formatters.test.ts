import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decimalComma,
  money,
  shortDate,
  shortMonthLabel,
  today,
} from "../src/lib/domain";

test("formats money in euros with Spanish separators", () => {
  assert.equal(money(0), "0,00\u00a0€");
  assert.equal(money(-3.456), "-3,46\u00a0€");
  assert.equal(money(1234.5), "1234,50\u00a0€");
  assert.equal(money(98765.432), "98.765,43\u00a0€");
});

test("formats short dates and months in UTC", () => {
  assert.equal(shortDate("2026-01-31"), "31 ene 2026");
  assert.equal(shortDate("2025-09-01"), "1 sept 2025");
  assert.equal(shortDate(""), "Sin fecha");
  assert.equal(shortMonthLabel("2026-09"), "sept");
});

test("decimalComma keeps the typed precision and marks unknown values", () => {
  assert.equal(decimalComma("0.123456789"), "0,123456789");
  assert.equal(decimalComma("0,5"), "0,5");
  assert.equal(decimalComma("12"), "12");
  assert.equal(decimalComma(""), "—");
});

test("today returns the current Madrid date on every call", () => {
  const expected = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(today(), expected);
});
