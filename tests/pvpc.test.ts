import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculatePvpc,
  parsePvpcDay,
  previousMonth,
  pvpcDates,
  summarizePvpc,
} from "../src/lib/pvpc";
import { loadPvpcMonth } from "../src/lib/pvpc-loader";
import { emptyWorkspace } from "../src/lib/domain";

// Four published fields from ESIOS archive 70, 2026-08-03; captured 2026-09-21.
const realDay = JSON.parse(
  readFileSync(
    new URL("./fixtures/pvpc-2026-08-03.json", import.meta.url),
    "utf8",
  ),
);
function day(date: string, hours = 24) {
  const [year, month, d] = date.split("-");
  return {
    PVPC: Array.from({ length: hours }, (_, h) => ({
      Dia: `${d}/${month}/${year}`,
      Hora: `${String(h).padStart(2, "0")}-${String(h + 1).padStart(2, "0")}`,
      PCB: h < 8 ? "-10,00" : h < 16 ? "100,00" : "200,00",
      TEUPCB: h < 8 ? "3,29" : h < 16 ? "29,27" : "97,55",
    })),
  };
}
const august = () => pvpcDates("2026-08").map((date) => day(date));
const profile = {
  ...emptyWorkspace().profile,
  days: "30",
  peakKwh: "100",
  flatKwh: "100",
  valleyKwh: "100",
  peakKw: "4",
  valleyKw: "4",
};

test("published retail PCB converts MWh to kWh and uses TEU only to identify periods", () => {
  const rows = parsePvpcDay(realDay, "2026-08-03");
  assert.equal(rows.length, 24);
  assert.equal(
    rows[0].price,
    Number(realDay.PVPC[0].PCB.replace(",", ".")) / 1000,
  );
  assert.deepEqual(
    [
      rows[0].period,
      rows[8].period,
      rows[10].period,
      rows[14].period,
      rows[18].period,
      rows[22].period,
    ],
    ["valley", "flat", "peak", "flat", "peak", "flat"],
  );
  const holiday = day("2026-12-08");
  holiday.PVPC.forEach((r) => {
    r.TEUPCB = "3,29";
  });
  assert.ok(
    parsePvpcDay(holiday, "2026-12-08").every((r) => r.period === "valley"),
  );
});

test("incomplete, duplicated, wrong-date and changed-toll upstream data are rejected", () => {
  const missing = day("2026-08-01");
  missing.PVPC.pop();
  const duplicate = day("2026-08-01");
  duplicate.PVPC[1] = duplicate.PVPC[0];
  const changed = day("2026-08-01");
  changed.PVPC[0].TEUPCB = "4,00";
  const invalid = day("2026-08-01");
  invalid.PVPC[0].PCB = "";
  for (const payload of [
    missing,
    duplicate,
    changed,
    invalid,
    day("2026-08-02"),
  ])
    assert.throws(() => parsePvpcDay(payload, "2026-08-01"));
  assert.throws(() => summarizePvpc("2026-08", august().slice(1)));
  const duplicateDay = august();
  duplicateDay[1] = duplicateDay[0];
  assert.throws(() => summarizePvpc("2026-08", duplicateDay));
});

test("ESIOS spring and autumn clock changes require exactly 23 and 25 hours", () => {
  const spring = day("2026-03-29");
  spring.PVPC.splice(2, 1);
  assert.equal(parsePvpcDay(spring, "2026-03-29").length, 23);
  assert.equal(parsePvpcDay(day("2026-10-25", 25), "2026-10-25").length, 25);
  assert.throws(() => parsePvpcDay(day("2026-10-25"), "2026-10-25"));
  assert.throws(() => parsePvpcDay(day("2026-03-29"), "2026-03-29"));
});

test("monthly means retain negative prices and use the number of hours in each period", () => {
  const payloads = august();
  // One all-valley holiday contributes 24 hours, not the same weight as an 8-hour period.
  payloads[0].PVPC.forEach((r) => {
    r.TEUPCB = "3,29";
    r.PCB = "300,00";
  });
  const data = summarizePvpc("2026-08", payloads);
  assert.equal(data.hours, 744);
  assert.deepEqual(data.counts, { peak: 240, flat: 240, valley: 264 });
  assert.ok(
    Math.abs(data.mean.valley - (240 * -0.01 + 24 * 0.3) / 264) < 1e-12,
  );
  assert.ok(Math.abs(data.mean.peak - 0.2) < 1e-12);
});

test("historical total includes regulated power, financing, rental and selected taxes", () => {
  const data = summarizePvpc("2026-08", august());
  const cost = calculatePvpc(data, profile, "0.03")!;
  assert.equal(cost.energy, 29);
  assert.equal(cost.power, 10.37);
  assert.equal(cost.social, 0.74);
  assert.equal(
    cost.snoee,
    0,
    "published PVPC energy already includes its regulated contribution",
  );
  assert.equal(cost.meter, 0.9);
  assert.equal(cost.total, 41.01);
  const taxed = calculatePvpc(
    data,
    { ...profile, taxes: true, vat: "21", electricityTax: "5.11269632" },
    "0.03",
  )!;
  assert.equal(taxed.electricityTax, 2.05);
  assert.equal(taxed.vat, 9.04);
  assert.equal(taxed.total, 52.1);
  assert.equal(
    calculatePvpc(data, { ...profile, valleyKw: "10.01" }, "0"),
    null,
  );
  assert.equal(calculatePvpc(data, { ...profile, peakKwh: "" }, "0"), null);
  assert.equal(calculatePvpc(data, { ...profile, days: "1.5" }, "0"), null);
  assert.equal(calculatePvpc(data, { ...profile, taxes: true }, "0"), null);
  assert.equal(calculatePvpc(data, profile, ""), null);
});

test("last complete month handles year rollover and rejects unreviewed regulated rates", () => {
  assert.equal(previousMonth("2026-09-21"), "2026-08");
  assert.equal(previousMonth("2027-01-01"), "2026-12");
  assert.throws(() => pvpcDates("2027-01"));
  assert.throws(() => pvpcDates("2026-06"));
  assert.throws(() => pvpcDates("../../secret"));
});

test("loader fetches exactly a complete month and fails closed when upstream fails", async () => {
  const urls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    const date = new URL(url).searchParams.get("date")!;
    return Response.json(day(date));
  };
  assert.equal((await loadPvpcMonth("2026-08", fakeFetch)).hours, 744);
  assert.equal(urls.length, 31);
  assert.equal(new Set(urls).size, 31);
  const failing: typeof fetch = async () =>
    new Response("Unavailable", { status: 503 });
  await assert.rejects(loadPvpcMonth("2026-08", failing));
  const wrongDate: typeof fetch = async () => Response.json(day("2026-08-01"));
  await assert.rejects(loadPvpcMonth("2026-08", wrongDate));
});
