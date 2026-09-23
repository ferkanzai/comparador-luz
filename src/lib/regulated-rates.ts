// Every regulated rate and reference price the calculator or copy relies on.
// When one changes, update it here and move `regulatedRatesReviewedOn`.
export const regulatedRatesReviewedOn = "2026-09-22";

export const generalVat = {
  percent: 21,
  source: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
};
export const electricityTax = {
  percent: 5.11269632,
  minimumPerKwh: 0.001,
  source: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741",
  rateSource:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/liquidacion-pago-impuesto/tipo-impositivo.html",
};

// Versioned references stay attached to saved tariffs and historical snapshots.
// Never replace a saved price when a reference changes.
export const meterRental = {
  "single-2013": { monthly: 0.81, name: "Monofásico" },
  "three-2013": { monthly: 1.36, name: "Trifásico" },
};
export const meterRentalSource =
  "https://www.i-de.es/accesos-gestiones-online/preguntas-frecuentes";
export const socialFinancing2026 = {
  annual: 9.011295,
  source: "https://www.boe.es/eli/es/o/2026/06/17/ted634",
};

/** PVPC power terms in €/kW/año: access tolls, charges and the fixed marketing margin. */
export const pvpcPower2026 = {
  peak: { tolls: 23.324952, charges: 4.379461, margin: 3.113 },
  valley: { tolls: 0.44377, charges: 0.281653 },
};

const rateFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 8,
});
export const formatRate = (value: number) => rateFormat.format(value);
export const regulatedRatesReviewedLabel = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(regulatedRatesReviewedOn));
export const meterRentalLabel = (kind: keyof typeof meterRental) =>
  `${meterRental[kind].name} · ${formatRate(meterRental[kind].monthly)} €/mes`;
