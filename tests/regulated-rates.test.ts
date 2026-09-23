import { test } from "node:test";
import assert from "node:assert/strict";
import {
  electricityTax,
  formatRate,
  generalVat,
  meterRentalLabel,
  regulatedRatesReviewedLabel,
  socialFinancing2026,
} from "../src/lib/regulated-rates";

test("regulated rates render with Spanish decimals and full precision", () => {
  assert.equal(formatRate(generalVat.percent), "21");
  assert.equal(formatRate(electricityTax.percent), "5,11269632");
  assert.equal(formatRate(electricityTax.minimumPerKwh), "0,001");
  assert.equal(formatRate(socialFinancing2026.annual), "9,011295");
  assert.equal(meterRentalLabel("single-2013"), "Monofásico · 0,81 €/mes");
  assert.equal(meterRentalLabel("three-2013"), "Trifásico · 1,36 €/mes");
  assert.equal(regulatedRatesReviewedLabel, "22/09/2026");
});

test("profile tax presets keep the stored decimal format", () => {
  assert.equal(String(generalVat.percent), "21");
  assert.equal(String(electricityTax.percent), "5.11269632");
});
