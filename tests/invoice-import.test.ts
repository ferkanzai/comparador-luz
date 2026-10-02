import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, newTariff, type Workspace } from "../src/lib/domain";
import { parseInvoiceQr } from "../src/lib/invoice-qr";
import { duplicateBill, planInvoiceImport } from "../src/lib/invoice-import";
import { commands } from "../src/lib/workspace-commands";

// The household's own invoice QR (CUPS replaced), the spec's worked example.
const example =
  "https://comparador.cnmc.gob.es/comparador/QRE?cp=28030&pP1=4.00&pP2=4.00&tc=E0&finContrato=2027-02-27&com=R2-760&cups=ES0000000000000000XX&tf=N&iniF=2026-08-12&finF=2026-09-10&impOtrosSinIE=0.77&exc=0&fFact=2026-09-16&caP1=138&caP2=148&caP3=257&iniA=2026-02-27&pmaxP1=3.164&pmaxP2=2.8&rev=0&verde=1&imp=26.35&cfP1=10&cfP2=10&cfP3=23&ajuste=0&finBS=0.72&impPot=14.38&impEner=4.92&prP1=35.405365&prP2=9.855365&prE1=0.192000&prE2=0.113000&prE3=0.082000";

test("an invoice QR reads billing dates, power, consumption, prices and amounts", () => {
  assert.deepEqual(parseInvoiceQr(example), {
    supplierCode: "R2-760",
    contractType: "E0",
    start: "2026-08-12",
    end: "2026-09-10",
    issued: "2026-09-16",
    contractEnd: "2027-02-27",
    peakKw: "4.00",
    valleyKw: "4.00",
    kwh: ["10", "10", "23"],
    energyPrices: ["0.192000", "0.113000", "0.082000"],
    powerPrices: ["35.405365", "9.855365"],
    total: "26.35",
    energy: "4.92",
    power: "14.38",
    socialFinancing: "0.72",
    otherWithoutTax: "0.77",
    otherWithTax: "",
    services: "",
    discount: "",
    surplus: "0",
    adjustment: "0",
    priceChange: "",
    promotion: false,
    penaltyEnds: "",
  });
});

test("the QR reads the same with &amp; separators, any key case and any order", () => {
  const [address, query] = example.split("?");
  const shuffled = query
    .split("&")
    .reverse()
    .map((pair) => pair.replace(/^[a-z]+/i, (key) => key.toUpperCase()))
    .join("&amp;");
  assert.deepEqual(
    parseInvoiceQr(`${address}?${shuffled}`),
    parseInvoiceQr(example),
  );
});

test("invoices outside the comparison model are refused with a reason", () => {
  assert.throws(
    () => parseInvoiceQr(example.replace("cp=28030", "cp=35001")),
    /Canarias/,
  );
  assert.throws(
    () => parseInvoiceQr(example.replace("tf=N", "tf=R")),
    /facturas normales/,
  );
  assert.throws(
    () => parseInvoiceQr("https://example.com/?imp=1"),
    /comparador de la CNMC/,
  );
  assert.throws(
    () => parseInvoiceQr(example.replace("&imp=26.35", "")),
    /\(imp\)/,
  );
});

const plan = (url = example, w: Workspace = emptyWorkspace()) =>
  planInvoiceImport(parseInvoiceQr(url), w);

test("the worked example becomes a reconciled bill, this invoice's profile and the supplier's tariff", () => {
  const { bill, profile, tariff, role, warnings, breakdownNote } = plan();
  assert.deepEqual(
    {
      month: bill.month,
      periodStart: bill.periodStart,
      periodEnd: bill.periodEnd,
      provider: bill.provider,
      paid: bill.paid,
      credit: bill.credit,
      kwh: bill.kwh,
      consumption: bill.consumption,
      breakdown: bill.breakdown,
    },
    {
      month: "2026-09",
      periodStart: "2026-08-12",
      periodEnd: "2026-09-10",
      provider: "Octopus Energy España",
      paid: "26.35",
      credit: "0",
      kwh: "43",
      consumption: { peakKwh: "10", flatKwh: "10", valleyKwh: "23" },
      breakdown: {
        energy: "4.92",
        power: "14.38",
        social: "0.72",
        snoee: "0.00",
        meter: "0.77",
        services: "0.00",
        electricityTax: "0.99",
        vat: "4.57",
        servicesVat: "0.00",
      },
    },
  );
  assert.equal(breakdownNote, "");
  assert.deepEqual(profile, {
    days: "29",
    peakKwh: "10",
    flatKwh: "10",
    valleyKwh: "23",
    peakKw: "4",
    valleyKw: "4",
    taxes: true,
    vat: "21",
    electricityTax: "5.11269632",
    minimumTax: true,
  });
  assert.deepEqual(bill.profile, profile);
  assert.ok(tariff);
  assert.deepEqual(
    {
      name: tariff.name,
      provider: tariff.provider,
      kind: tariff.kind,
      energy: [tariff.energyPeak, tariff.energyFlat, tariff.energyValley],
      power: [tariff.powerPeak, tariff.powerValley],
      powerKind: tariff.powerKind,
      powerUnit: tariff.powerUnit,
      meterDay: Number(tariff.meterDay).toFixed(6),
      socialDay: Number(tariff.socialDay).toFixed(6),
      socialInElectricityTax: tariff.socialInElectricityTax,
      checkedOn: tariff.checkedOn,
      validUntil: tariff.validUntil,
    },
    {
      name: "Octopus Energy España",
      provider: "Octopus Energy España",
      kind: "periods",
      energy: ["0.192", "0.113", "0.082"],
      power: ["35.405365", "9.855365"],
      powerKind: "periods",
      powerUnit: "year",
      // The regulated single-phase rental, 0.81 €/month.
      meterDay: "0.026630",
      socialDay: "0.024828",
      socialInElectricityTax: false,
      checkedOn: "2026-09-16",
      validUntil: "",
    },
  );
  assert.deepEqual(bill.tariff, tariff);
  assert.equal(role, "current");
  assert.deepEqual(warnings, []);
});

test("indexed, PVPC, flexible and flat-rate invoices record the bill but no tariff", () => {
  for (const type of ["A0", "B0", "C0", "D0", "G0", "H0"]) {
    const result = plan(example.replace("tc=E0", `tc=${type}`));
    assert.equal(result.tariff, null, type);
    assert.equal(result.bill.tariff, null, type);
    assert.equal(result.role, null, type);
    assert.match(result.tariffNote, /precio fijo/, type);
  }
  assert.match(
    plan(example.replace("tc=E0", "tc=A0")).warnings.join(" "),
    /PVPC/,
  );
});

test("a single energy price becomes a flat energy price tariff", () => {
  const result = plan(
    example
      .replace("tc=E0", "tc=F0")
      .replace("&prE2=0.113000&prE3=0.082000", ""),
  );
  assert.equal(result.tariff?.kind, "fixed");
  assert.equal(result.tariff?.energyPeak, "0.192");
});

test("pre-tax adjustments leave the bill without a breakdown, with a reason", () => {
  for (const extra of ["&dto=1.00", "&impOtrosConIE=1.00", "&exc=2.10"]) {
    const result = plan(example.replace("&exc=0", "") + extra);
    assert.equal(result.bill.breakdown, null, extra);
    assert.match(result.breakdownNote, /antes de impuestos/, extra);
  }
  const unbalanced = plan(example.replace("imp=26.35", "imp=27.35"));
  assert.equal(unbalanced.bill.breakdown, null);
  assert.match(unbalanced.breakdownNote, /no cuadran/);
});

test("self-consumption warns only when there is surplus compensation", () => {
  assert.deepEqual(plan().warnings, []);
  assert.match(
    plan(example.replace("exc=0", "exc=2.10")).warnings.join(" "),
    /autoconsumo/,
  );
});

test("other charges that aren't a regulated meter rental leave the rental empty, with a warning", () => {
  const result = plan(
    example
      .replace("impOtrosSinIE=0.77", "impOtrosSinIE=30.77")
      .replace("imp=26.35", "imp=62.65"),
  );
  assert.equal(result.tariff?.meterDay, "");
  assert.match(result.warnings.join(" "), /alquiler/);
  assert.equal(result.bill.breakdown?.meter, "30.77");
});

test("a discount offers effective rates from the billed amounts instead of the list prices", () => {
  assert.equal(plan().effectiveTariff, null);
  // 10% off energy: 4.43 instead of 4.92.
  const result = plan(
    example
      .replace("impEner=4.92", "impEner=4.43")
      .replace("imp=26.35", "imp=25.72"),
  );
  assert.match(result.warnings.join(" "), /descuento/);
  const discounted = result.effectiveTariff;
  assert.ok(discounted);
  assert.deepEqual(
    [discounted.energyPeak, discounted.energyFlat, discounted.energyValley].map(
      (price) => Number(price).toFixed(4),
    ),
    ["0.1723", "0.1014", "0.0736"],
  );
  assert.equal(discounted.powerPeak, "35.405365");
});

test("price changes, promotions and early-exit penalties are noted on review and in the tariff", () => {
  const result = plan(`${example}&cambio=2&promo=1&finPen=2027-01-31`);
  assert.equal(result.warnings.length, 3);
  for (const pattern of [/próxima factura/, /promoción/, /penalización/]) {
    assert.match(result.warnings.join(" "), pattern);
    assert.match(result.tariff?.notes ?? "", pattern);
  }
});

test("a bill from the same supplier for the same period is a possible duplicate", () => {
  const w = emptyWorkspace();
  w.bills.push(plan().bill);
  const bill = plan(example, w).bill;
  assert.equal(duplicateBill(w, bill), true);
  assert.equal(duplicateBill(w, { ...bill, provider: "Otra" }), false);
  // An unknown supplier never matches another bill without one.
  w.bills[0].provider = "";
  assert.equal(duplicateBill(w, { ...bill, provider: "" }), false);
});

test("a gap in energy prices ends them, and unreadable text is explained", () => {
  assert.deepEqual(
    parseInvoiceQr(example.replace("&prE2=0.113000", "")).energyPrices,
    ["0.192000"],
  );
  assert.throws(
    () => parseInvoiceQr(example.replace("cp=28030", "cp=%E0%A4%A")),
    /ilegible/,
  );
  assert.throws(
    () => parseInvoiceQr(example.replace("tf=N", "tf=X")),
    /facturas normales/,
  );
});

test("totals that don't reconcile warn, because the tariff's tax treatment is a guess", () => {
  assert.match(
    plan(example.replace("imp=26.35", "imp=27.35")).warnings.join(" "),
    /no cuadran/,
  );
});

test("the tariff's role follows the household's current tariff", () => {
  assert.equal(plan().role, "current");
  const same = { ...plan().tariff!, id: crypto.randomUUID() };
  const w: Workspace = {
    ...emptyWorkspace(),
    tariffs: [same],
    currentId: same.id,
    currentSince: "2026-02-27",
  };
  assert.equal(plan(example, w).role, "matches-current");
  // The same prices quoted per day still match.
  w.tariffs = [
    {
      ...same,
      powerUnit: "day",
      powerPeak: String(35.405365 / 365),
      powerValley: String(9.855365 / 365),
    },
  ];
  assert.equal(plan(example, w).role, "matches-current");
  w.tariffs = [
    { ...newTariff(), id: same.id, name: "Otra", energyPeak: "0.2" },
  ];
  assert.equal(plan(example, w).role, "price-change");
});

const importInto = (
  w: Workspace,
  choices: Partial<Parameters<typeof commands.importInvoice>[0]> = {},
) => {
  const { bill, profile, tariff, role } = plan(example, w);
  const command = commands.importInvoice({
    bill,
    profile,
    tariff,
    role: role!,
    since: "2026-02-27",
    ...choices,
  });
  const after = command.apply(w);
  return { after, requests: command.requests(w, after) };
};

test("importing into an empty comparison records the bill, the profile and the current tariff", () => {
  const { after, requests } = importInto(emptyWorkspace());
  assert.equal(after.bills.length, 1);
  assert.equal(after.profile.days, "29");
  assert.equal(after.tariffs.length, 1);
  assert.equal(after.currentId, after.tariffs[0].id);
  assert.equal(after.currentSince, "2026-02-27");
  assert.equal(after.bills[0].tariff?.energyPeak, "0.192");
  assert.deepEqual(
    requests.map(
      (r) => `${r.method} ${r.path.replace(/[0-9a-f-]{36}/, ":id")}`,
    ),
    ["PATCH /api/profile", "POST /api/contract/current", "PUT /api/bills/:id"],
  );
});

test("a current tariff needs the date its terms began", () => {
  assert.throws(
    () => importInto(emptyWorkspace(), { since: "" }),
    /desde cuándo/,
  );
});

test("unticked choices save nothing for them", () => {
  const w = emptyWorkspace();
  const { after, requests } = importInto(w, {
    bill: null,
    profile: null,
    tariff: null,
  });
  assert.deepEqual(after, w);
  assert.deepEqual(requests, []);
});

test("a price change keeps the previous terms in the tariff history", () => {
  const old = {
    ...newTariff(),
    name: "Antes",
    energyPeak: "0.2",
    energyFlat: "0.1",
    energyValley: "0.05",
    powerPeak: "0.1",
    powerValley: "0.01",
  };
  const w: Workspace = {
    ...emptyWorkspace(),
    tariffs: [old],
    currentId: old.id,
    currentSince: "2025-02-27",
  };
  const { after } = importInto(w, {
    role: "price-change",
    since: "2026-02-27",
  });
  assert.equal(
    after.tariffs.find((t) => t.id === after.currentId)?.energyPeak,
    "0.192",
  );
  assert.deepEqual(
    after.history.map((h) => [h.tariff.name, h.start, h.end]),
    [["Antes", "2025-02-27", "2026-02-27"]],
  );
});

test("saving as an offer or matching the current tariff leaves the current tariff alone", () => {
  const old = { ...newTariff(), name: "Antes", energyPeak: "0.2" };
  const w: Workspace = {
    ...emptyWorkspace(),
    tariffs: [old],
    currentId: old.id,
    currentSince: "2025-02-27",
  };
  const offer = importInto(w, { role: "offer", since: "" });
  assert.equal(offer.after.currentId, old.id);
  assert.equal(offer.after.tariffs.length, 2);
  assert.ok(offer.requests.some((r) => r.path.startsWith("/api/offers/")));
  const matching = importInto(w, { role: "matches-current", since: "" });
  assert.deepEqual(matching.after.tariffs, [old]);
  assert.equal(matching.after.bills.length, 1);
});
