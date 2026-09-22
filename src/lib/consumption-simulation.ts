import { consumptionSchema, type Consumption, type Profile } from "./domain";

export type ConsumptionSimulation = Consumption;

export function startSimulation(profile: Profile): ConsumptionSimulation {
  return {
    peakKwh: profile.peakKwh,
    flatKwh: profile.flatKwh,
    valleyKwh: profile.valleyKwh,
  };
}

export function readSimulation(simulation: ConsumptionSimulation): {
  consumption: Consumption | null;
  error: string;
} {
  if (Object.values(simulation).some((value) => value === ""))
    return {
      consumption: null,
      error:
        "Completa los tres períodos. Escribe 0 si no has consumido en uno de ellos.",
    };
  const result = consumptionSchema.safeParse(simulation);
  if (!result.success)
    return {
      consumption: null,
      error:
        "Introduce entre 0 y 1.000.000 kWh en cada período, con coma o punto decimal.",
    };
  return { consumption: result.data, error: "" };
}
