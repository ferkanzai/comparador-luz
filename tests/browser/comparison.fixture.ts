import type { Page } from "@playwright/test";
import {
  emptyWorkspace,
  newTariff,
  type Workspace,
} from "../../src/lib/domain";

export function comparisonFixture(): Workspace {
  const tariff = {
    ...newTariff(),
    name: "Casa 24h",
    provider: "Compañía actual",
    kind: "fixed" as const,
    energyPeak: "0.20",
    powerPeak: "0.08",
    powerValley: "0.02",
    powerUnit: "day" as const,
  };
  return {
    ...emptyWorkspace(),
    profile: {
      ...emptyWorkspace().profile,
      days: "30",
      peakKw: "3.45",
      valleyKw: "3.45",
      peakKwh: "100",
      flatKwh: "150",
      valleyKwh: "250",
    },
    currentId: tariff.id,
    currentSince: "2026-01-01",
    tariffs: [
      tariff,
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Clara Fija",
        provider: "Clara",
        energyPeak: "0.14",
      },
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Luna Noche",
        provider: "Luna",
        kind: "periods",
        energyPeak: "0.30",
        energyFlat: "0.20",
        energyValley: "0.08",
      },
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Brisa Anual",
        provider: "Brisa",
        energyPeak: "0.16",
        powerUnit: "year",
        powerPeak: "29.2",
        powerValley: "7.3",
      },
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Sol Mensual",
        provider: "Sol",
        energyPeak: "0.18",
        powerUnit: "month",
        powerKind: "combined",
        powerPeak: "3",
        powerValley: "",
      },
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Verde Completa",
        provider: "Verde",
        energyPeak: "0.19",
        meterDay: "0.03",
        meterEstimate: "single-2013",
        socialDay: "0.04",
        snoeeKwh: "0.002",
        servicesMonth: "3",
      },
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Oferta caducada",
        provider: "Archivo",
        energyPeak: "0.01",
        validUntil: "2026-01-01",
      },
      {
        ...tariff,
        id: crypto.randomUUID(),
        name: "Por completar",
        provider: "Pendiente",
        energyPeak: "",
      },
    ],
  };
}

export async function openComparison(page: Page, data = comparisonFixture()) {
  await page.clock.setFixedTime(new Date("2026-09-22T12:00:00Z"));
  await page.addInitScript((workspace) => {
    if (!localStorage.getItem("luz:comparison-draft:v1:guest")) {
      localStorage.setItem(
        "luz:comparison-draft:v1:guest",
        JSON.stringify({ data: workspace, version: 0 }),
      );
    }
  }, data);
  await page.goto("/");
}
