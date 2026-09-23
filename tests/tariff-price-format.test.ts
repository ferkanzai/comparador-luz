import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTariffPrice } from "../src/lib/tariff-price-format";

test("formats long quotes without losing the distinction between missing, zero and tiny positive rates", () => {
  assert.equal(formatTariffPrice(""), "—");
  assert.equal(formatTariffPrice("0"), "0");
  assert.equal(formatTariffPrice("0.20"), "0,20");
  assert.equal(formatTariffPrice("0.081739130435"), "0,081739");
  assert.equal(formatTariffPrice("0,081739130435"), "0,081739");
  assert.equal(formatTariffPrice("0.0000001"), "<0,000001");
});
