"use client";

import { useState, useSyncExternalStore } from "react";
import type { Tariff } from "@/lib/domain";

const storageKey = "luz:power-comparison-unit:v1";
type PowerUnit = Tariff["powerUnit"];

function readUnit(): PowerUnit | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "day" || value === "month" || value === "year"
      ? value
      : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) onChange();
  }
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

const serverUnit = () => null;

export function usePowerComparisonUnit(defaultUnit: PowerUnit) {
  const storedUnit = useSyncExternalStore(subscribe, readUnit, serverUnit);
  const [selectedUnit, setSelectedUnit] = useState<PowerUnit | null>(null);

  function selectUnit(unit: PowerUnit) {
    setSelectedUnit(unit);
    try {
      localStorage.setItem(storageKey, unit);
    } catch {
      // The selection still works for this visit when browser storage is unavailable.
    }
  }

  return [selectedUnit ?? storedUnit ?? defaultUnit, selectUnit] as const;
}
