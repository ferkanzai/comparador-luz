import { calculateTotals, cents } from "./calculator";
import {
  emptyWorkspace,
  newTariff,
  numberOf,
  powerDayFactor,
  shortDate,
  type Bill,
  type Profile,
  type Tariff,
  type Workspace,
} from "./domain";
import type { InvoiceQr } from "./invoice-qr";
import { electricityTax, generalVat, meterRental } from "./regulated-rates";
import { supplierNames } from "./suppliers";
import type { TariffRole } from "./workspace-actions";

export type InvoiceImport = {
  bill: Bill;
  /** Why the bill has no breakdown, or "". */
  breakdownNote: string;
  profile: Profile;
  tariff: Tariff | null;
  /** Why no tariff can be saved, or "". */
  tariffNote: string;
  /** Effective rates from billed amounts, when a discount makes them differ from the list prices. */
  effectiveTariff: Tariff | null;
  role: TariffRole | null;
  warnings: string[];
};

const decimal = (s: string) => (s === "" ? "" : String(Number(s)));
const twoDecimals = (n: number) => n.toFixed(2);
// Billed subtotals are rounded to cents, so a couple of cents of difference is rounding.
const matches = (a: number, b: number) => Math.abs(a - b) <= 0.02;

export function planInvoiceImport(qr: InvoiceQr, w: Workspace): InvoiceImport {
  const warnings: string[] = [];
  const days = (Date.parse(qr.end) - Date.parse(qr.start)) / 86_400_000;
  if (!(days > 0))
    throw new Error(
      "Las fechas del período facturado del código QR no son válidas.",
    );
  const supplier = supplierNames[qr.supplierCode] ?? "";
  if (qr.contractType[0] === "A")
    warnings.push(
      "Es una factura PVPC: se registra lo que pagaste, pero sus precios cambian cada hora y no se guardan como tarifa.",
    );
  if (numberOf(qr.surplus) > 0)
    warnings.push(
      "La factura tiene autoconsumo: la compensación de excedentes no forma parte de la comparativa.",
    );
  const [peakKwh, flatKwh, valleyKwh] = qr.kwh.map(decimal);
  const profile: Profile = {
    ...emptyWorkspace().profile,
    days: String(days),
    peakKwh,
    flatKwh,
    valleyKwh,
    peakKw: decimal(qr.peakKw),
    valleyKw: decimal(qr.valleyKw),
    taxes: true,
    vat: String(generalVat.percent),
    electricityTax: String(electricityTax.percent),
    minimumTax: true,
  };
  const kwh = qr.kwh.reduce((sum, value) => sum + numberOf(value), 0);
  const social = Math.max(numberOf(qr.socialFinancing), 0);
  const other = numberOf(qr.otherWithoutTax);

  // Taxes aren't in the QR: recalculate them, and learn whether social-bonus
  // financing is inside the electricity-tax base from which one reproduces the total.
  const amounts = {
    energy: numberOf(qr.energy),
    power: numberOf(qr.power),
    social,
    snoee: 0,
    meter: other,
    services: numberOf(qr.services),
    kwh,
    days,
  };
  const reconciled = [true, false]
    .map((inside) => ({
      inside,
      totals: calculateTotals(amounts, profile, inside),
    }))
    .find(({ totals }) => matches(totals.total, numberOf(qr.total)));
  const adjusted = [
    qr.discount,
    qr.surplus,
    qr.otherWithTax,
    qr.adjustment,
  ].some((value) => numberOf(value) !== 0);
  const breakdownNote =
    qr.energy === "" || qr.power === ""
      ? "La factura no indica los importes de energía y potencia."
      : adjusted
        ? "La factura incluye descuentos, compensación de excedentes u otros ajustes antes de impuestos que el desglose no recoge."
        : !reconciled
          ? "Los importes de la factura no cuadran con los impuestos vigentes."
          : "";
  if (!adjusted && qr.energy !== "" && !reconciled)
    warnings.push(
      "Los importes de la factura no cuadran con los impuestos vigentes: revisa si la financiación del bono social tributa el impuesto eléctrico en tu tarifa.",
    );
  let breakdown: Bill["breakdown"] = null;
  if (!breakdownNote && reconciled) {
    const t = reconciled.totals;
    const lines = {
      energy: t.energy,
      power: t.power,
      social: t.social,
      snoee: 0,
      meter: t.meter,
      services: t.services,
      electricityTax: t.electricityTax,
      servicesVat: t.servicesVat,
    };
    const rest = Object.values(lines).reduce((sum, value) => sum + value, 0);
    // IVA absorbs the rounding, so the breakdown matches the paid total exactly.
    const vat = cents(numberOf(qr.total) - rest);
    breakdown = {
      energy: twoDecimals(lines.energy),
      power: twoDecimals(lines.power),
      social: twoDecimals(lines.social),
      snoee: twoDecimals(0),
      meter: twoDecimals(lines.meter),
      services: twoDecimals(lines.services),
      electricityTax: twoDecimals(lines.electricityTax),
      vat: twoDecimals(vat),
      servicesVat: twoDecimals(lines.servicesVat),
    };
  }

  const tariff = invoiceTariff(qr, days, supplier, reconciled?.inside);
  let effectiveTariff: Tariff | null = null;
  if (tariff.tariff) {
    const t = tariff.tariff;
    if (other > 0 && !t.meterDay)
      warnings.push(
        `Los otros cargos de la factura (${twoDecimals(other)} €) no coinciden con un alquiler de contador regulado; el alquiler de la tarifa queda vacío.`,
      );
    // List prices come before discounts; billed subtotals include them.
    const listEnergy =
      t.kind === "fixed"
        ? kwh * numberOf(t.energyPeak)
        : numberOf(peakKwh) * numberOf(t.energyPeak) +
          numberOf(flatKwh) * numberOf(t.energyFlat) +
          numberOf(valleyKwh) * numberOf(t.energyValley);
    const listPower =
      ((numberOf(profile.peakKw) * numberOf(t.powerPeak) +
        numberOf(profile.valleyKw) * numberOf(t.powerValley)) *
        days) /
      365;
    const energyRatio =
      qr.energy !== "" && listEnergy > 0 && !matches(listEnergy, amounts.energy)
        ? amounts.energy / listEnergy
        : 1;
    const powerRatio =
      qr.power !== "" && listPower > 0 && !matches(listPower, amounts.power)
        ? amounts.power / listPower
        : 1;
    if (energyRatio !== 1 || powerRatio !== 1)
      warnings.push(
        "La factura aplica un descuento: sus precios de lista son anteriores a él. Puedes guardar en su lugar los precios efectivos calculados desde los importes.",
      );
    else if (numberOf(qr.discount) > 0)
      warnings.push(
        `La factura aplica un descuento de ${twoDecimals(numberOf(qr.discount))} € que la tarifa guardada no recoge.`,
      );
    if (energyRatio !== 1 || powerRatio !== 1) {
      const scale = (price: string, ratio: number) =>
        price === ""
          ? ""
          : String(Number((numberOf(price) * ratio).toFixed(12)));
      effectiveTariff = {
        ...t,
        energyPeak: scale(t.energyPeak, energyRatio),
        energyFlat: scale(t.energyFlat, energyRatio),
        energyValley: scale(t.energyValley, energyRatio),
        powerPeak: scale(t.powerPeak, powerRatio),
        powerValley: scale(t.powerValley, powerRatio),
      };
    }
  }
  const notices = [
    qr.priceChange === "1"
      ? "Los precios cambiaron durante este período; el código QR indica los nuevos."
      : "",
    qr.priceChange === "2" ? "Los precios cambian en la próxima factura." : "",
    qr.promotion
      ? "La factura incluye una promoción que no dura todo el contrato."
      : "",
    qr.penaltyEnds
      ? `Hay penalización por cambiar de comercializadora hasta el ${shortDate(qr.penaltyEnds)}.`
      : "",
  ].filter(Boolean);
  warnings.push(...notices);
  if (tariff.tariff && notices.length) tariff.tariff.notes = notices.join("\n");
  const bill: Bill = {
    id: crypto.randomUUID(),
    month: qr.end.slice(0, 7),
    periodStart: qr.start,
    periodEnd: qr.end,
    provider: supplier,
    paid: decimal(qr.total),
    credit: "0",
    kwh: String(Number(kwh.toFixed(6))),
    consumption: { peakKwh, flatKwh, valleyKwh },
    notes: `Importada del código QR de la factura${qr.issued ? ` del ${shortDate(qr.issued)}` : ""}.`,
    tariff: tariff.tariff,
    profile,
    breakdown,
  };
  return {
    bill,
    breakdownNote,
    profile,
    tariff: tariff.tariff,
    tariffNote: tariff.note,
    effectiveTariff,
    role: tariff.tariff ? tariffRole(tariff.tariff, w) : null,
    warnings,
  };
}

function invoiceTariff(
  qr: InvoiceQr,
  days: number,
  supplier: string,
  socialInElectricityTax = true,
): { tariff: Tariff | null; note: string } {
  const type = qr.contractType[0];
  const kind = type === "E" ? "periods" : type === "F" ? "fixed" : null;
  if (!kind)
    return {
      tariff: null,
      note: "Esta factura no es de precio fijo, así que sus precios no describen una tarifa que comparar.",
    };
  const energy = qr.energyPrices.map(decimal);
  if (
    energy.length < (kind === "periods" ? 3 : 1) ||
    qr.powerPrices.some((price) => price === "")
  )
    return {
      tariff: null,
      note: "El código QR no incluye todos los precios de la tarifa.",
    };
  const meter = Object.values(meterRental).find(({ monthly }) =>
    matches((monthly * 12 * days) / 365, numberOf(qr.otherWithoutTax)),
  );
  const social = numberOf(qr.socialFinancing);
  return {
    note: "",
    tariff: {
      ...newTariff(),
      name: supplier,
      provider: supplier,
      kind,
      energyPeak: energy[0],
      energyFlat: kind === "periods" ? energy[1] : "",
      energyValley: kind === "periods" ? energy[2] : "",
      powerPeak: decimal(qr.powerPrices[0]),
      powerValley: decimal(qr.powerPrices[1]),
      powerKind: "periods",
      powerUnit: "year",
      meterDay: meter ? ((meter.monthly * 12) / 365).toFixed(12) : "",
      socialDay: social > 0 ? (social / days).toFixed(12) : "",
      socialInElectricityTax,
      checkedOn: qr.issued,
    },
  };
}

function tariffRole(tariff: Tariff, w: Workspace): TariffRole {
  const current = w.tariffs.find((t) => t.id === w.currentId);
  if (!current) return "current";
  return samePrices(tariff, current) ? "matches-current" : "price-change";
}

function samePrices(a: Tariff, b: Tariff) {
  const energy = (t: Tariff) =>
    t.kind === "fixed"
      ? [t.energyPeak]
      : [t.energyPeak, t.energyFlat, t.energyValley];
  const power = (t: Tariff) =>
    [t.powerPeak, t.powerKind === "same" ? t.powerPeak : t.powerValley].map(
      (price) => numberOf(price) * powerDayFactor(t.powerUnit),
    );
  const close = (x: number[], y: number[]) =>
    x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) < 1e-9);
  return (
    a.kind === b.kind &&
    a.powerKind !== "combined" &&
    b.powerKind !== "combined" &&
    close(energy(a).map(numberOf), energy(b).map(numberOf)) &&
    close(power(a), power(b))
  );
}

/** Another recorded bill from the same supplier for the same billing period. */
export function duplicateBill(w: Workspace, bill: Bill) {
  const supplier = bill.provider.trim().toLowerCase();
  return (
    !!supplier &&
    w.bills.some(
      (b) =>
        b.id !== bill.id &&
        b.periodStart === bill.periodStart &&
        b.periodEnd === bill.periodEnd &&
        b.provider.trim().toLowerCase() === supplier,
    )
  );
}
