// The CNMC invoice QR (Resolución de 6 de octubre de 2022, BOE-A-2022-16989, Anexo I).
// Amounts stay as entered decimal strings; an absent optional field is "".

export type InvoiceQr = {
  supplierCode: string;
  /** Two characters: the price type letter, then 1 when there is a fixed monthly fee. */
  contractType: string;
  /** Billing period: the start is a meter reading, so days = end − start. */
  start: string;
  end: string;
  issued: string;
  contractEnd: string;
  peakKw: string;
  valleyKw: string;
  /** This invoice's kWh in P1, P2, P3. */
  kwh: [string, string, string];
  /** €/kWh before taxes and discounts; only as many as the contract has. */
  energyPrices: string[];
  /** €/kW·year before taxes and discounts. */
  powerPrices: [string, string];
  total: string;
  energy: string;
  power: string;
  /** -1 PVPC, 0 built into the price, otherwise the billed amount. */
  socialFinancing: string;
  otherWithoutTax: string;
  otherWithTax: string;
  services: string;
  discount: string;
  surplus: string;
  adjustment: string;
  /** "1" prices changed within this period, "2" they change on the next invoice. */
  priceChange: string;
  promotion: boolean;
  penaltyEnds: string;
};

const qrPath = /^https?:\/\/comparador\.cnmc\.gob\.es\/comparador\/?\s*\/QRE$/i;
const amount = /^-?\d+(?:\.\d+)?$/;
const date = /^\d{4}-\d{2}-\d{2}$/;

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error("El código QR de la factura tiene un dato ilegible.");
  }
}

/** Reads an invoice QR's text, or throws a Spanish message saying why it can't be imported. */
export function parseInvoiceQr(text: string): InvoiceQr {
  const [address, query = ""] = text.trim().split("?");
  if (!qrPath.test(address.replace(/\s+/g, "")))
    throw new Error(
      "Este código QR no es el de una factura de luz (no enlaza al comparador de la CNMC).",
    );
  const fields = new Map<string, string>();
  for (const pair of query.replaceAll("&amp;", "&").split("&")) {
    const at = pair.indexOf("=");
    if (at < 0) continue;
    fields.set(
      pair.slice(0, at).trim().toLowerCase(),
      decode(pair.slice(at + 1)).trim(),
    );
  }
  const read = (key: string, format?: RegExp, required = false) => {
    const value = fields.get(key.toLowerCase()) ?? "";
    if ((required && !value) || (value && format && !format.test(value)))
      throw new Error(
        `El código QR de la factura tiene un dato incompleto o ilegible (${key}).`,
      );
    return value;
  };
  if (/^3[58]/.test(read("cp")))
    throw new Error(
      "Las facturas de Canarias no se pueden importar: el comparador cubre la Península y Baleares.",
    );
  if (read("tf", undefined, true).toUpperCase() !== "N")
    throw new Error(
      "Solo se pueden importar facturas normales. Las rectificativas, de regularización o de anulación no tienen precios.",
    );
  // Prices fill from P1, so a gap ends them: P3 without P2 isn't a P2 price.
  const prices = ["prE1", "prE2", "prE3"].map((key) => read(key, amount));
  const gap = prices.indexOf("");
  const energyPrices = gap < 0 ? prices : prices.slice(0, gap);
  return {
    supplierCode: read("com", /^R2-\d+$/i).toUpperCase(),
    contractType: read("tc", /^[A-H][01]$/i, true).toUpperCase(),
    start: read("iniF", date, true),
    end: read("finF", date, true),
    issued: read("fFact", date),
    contractEnd: read("finContrato", date),
    peakKw: read("pP1", amount, true),
    valleyKw: read("pP2", amount, true),
    kwh: [
      read("cfP1", amount, true),
      read("cfP2", amount, true),
      read("cfP3", amount, true),
    ],
    energyPrices,
    powerPrices: [read("prP1", amount), read("prP2", amount)],
    total: read("imp", amount, true),
    energy: read("impEner", amount),
    power: read("impPot", amount),
    socialFinancing: read("finBS", amount),
    otherWithoutTax: read("impOtrosSinIE", amount),
    otherWithTax: read("impOtrosConIE", amount),
    services: read("impSA", amount),
    discount: read("dto", amount),
    surplus: read("exc", amount),
    adjustment: read("ajuste", amount),
    priceChange: read("cambio", /^[12]$/),
    promotion: read("promo") === "1",
    penaltyEnds: read("finPen", date),
  };
}
