import { emptyWorkspace, newTariff, type Tariff, type Workspace } from "../../src/lib/domain";

const note = "Precio revisado en la web de la comercializadora; incluye descuento de bienvenida el primer año.";

function fullTariff(i: number): Tariff {
  return {
    ...newTariff(),
    name: `Tarifa de ejemplo con nombre largo ${i}`,
    provider: `Comercializadora eléctrica ${i}`,
    energyPeak: "0.182345",
    energyFlat: "0.123456",
    energyValley: "0.087654",
    powerPeak: "0.104536",
    powerValley: "0.034567",
    meterDay: "0.026630",
    socialDay: "0.024689",
    snoeeKwh: "0.001234",
    servicesMonth: "2.99",
    url: `https://www.comercializadora-ejemplo.es/tarifas/luz/plan-${i}?utm_source=comparador`,
    checkedOn: "2026-09-01",
    validUntil: "2027-09-01",
    notes: note,
  };
}

/** Every list at its schema maximum, with every field filled as a real user would. */
export function maxCountWorkspace(): Workspace {
  const tariffs = Array.from({ length: 100 }, (_, i) => fullTariff(i));
  const profile = {
    days: "31",
    peakKwh: "123.45",
    flatKwh: "98.76",
    valleyKwh: "150.12",
    peakKw: "4.6",
    valleyKw: "4.6",
    taxes: true,
    vat: "21",
    electricityTax: "5.11269632",
    minimumTax: true,
  };
  return {
    ...emptyWorkspace(),
    profile,
    tariffs,
    currentId: tariffs[0].id,
    currentSince: "2020-01-01",
    history: Array.from({ length: 500 }, (_, i) => ({
      id: crypto.randomUUID(),
      start: "2020-01-01",
      end: "2020-12-31",
      tariff: fullTariff(i),
    })),
    bills: Array.from({ length: 1200 }, (_, i) => ({
      id: crypto.randomUUID(),
      month: `${1900 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      provider: "Comercializadora eléctrica",
      paid: "80.00",
      credit: "0",
      kwh: "372.33",
      consumption: { peakKwh: "123.45", flatKwh: "98.76", valleyKwh: "150.12" },
      notes: note,
      tariff: fullTariff(i),
      profile,
      breakdown: {
        energy: "40.00",
        power: "15.00",
        social: "0.50",
        snoee: "0.20",
        meter: "0.81",
        services: "3.00",
        electricityTax: "3.00",
        vat: "14.00",
        servicesVat: "3.49",
      },
    })),
  };
}
