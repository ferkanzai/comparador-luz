import {
  consumptionSchema,
  decimal,
  numberOf,
  type Consumption,
  type Profile,
} from "./domain";

export type ConsumptionSimulation = {
  total: string;
  shares: [string, string, string];
};
const valueString = (value: number) => String(Number(value.toFixed(6)));

export function startSimulation(profile: Profile): ConsumptionSimulation {
  const values = [profile.peakKwh, profile.flatKwh, profile.valleyKwh];
  const known =
    consumptionSchema.safeParse(profile).success &&
    values.every((value) => value !== "");
  const total = known
    ? values.reduce((sum, value) => sum + numberOf(value), 0)
    : null;
  return {
    total: total === null ? "" : valueString(total),
    shares: total
      ? [
          valueString((numberOf(values[0]) / total) * 100),
          valueString((numberOf(values[1]) / total) * 100),
          valueString((numberOf(values[2]) / total) * 100),
        ]
      : ["", "", ""],
  };
}

export function readSimulation(simulation: ConsumptionSimulation): {
  consumption: Consumption | null;
  error: string;
} {
  if (
    simulation.total === "" ||
    !decimal(3_000_000).safeParse(simulation.total).success
  )
    return { consumption: null, error: "Introduce un consumo total válido." };
  const total = numberOf(simulation.total);
  if (total === 0 && simulation.shares.every((value) => value === ""))
    return {
      consumption: { peakKwh: "0", flatKwh: "0", valleyKwh: "0" },
      error: "",
    };
  if (
    simulation.shares.some(
      (value) => value === "" || !decimal(100).safeParse(value).success,
    )
  )
    return {
      consumption: null,
      error:
        "Indica qué porcentaje consumes en cada periodo; no suponemos un reparto.",
    };
  const shares = simulation.shares.map(numberOf);
  const sum = shares.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.00001)
    return {
      consumption: null,
      error:
        "El reparto debe sumar 100 %. Ajusta los porcentajes para continuar.",
    };
  // Allocate micro-kWh by largest remainder so displayed periods conserve the total.
  const units = Math.round(total * 1_000_000);
  const exact = shares.map((share) => (units * share) / sum);
  const allocated = exact.map(Math.floor);
  const remainder = units - allocated.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - allocated[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i++) allocated[order[i].index]++;
  const consumption = {
    peakKwh: valueString(allocated[0] / 1_000_000),
    flatKwh: valueString(allocated[1] / 1_000_000),
    valleyKwh: valueString(allocated[2] / 1_000_000),
  };
  if (!consumptionSchema.safeParse(consumption).success)
    return {
      consumption: null,
      error:
        "Cada periodo admite hasta 1.000.000 kWh. Reduce el consumo simulado.",
    };
  return { consumption, error: "" };
}
