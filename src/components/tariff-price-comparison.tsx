"use client";
import { useId, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import {
  shortDate,
  comparablePowerPrice,
  formatPowerPrice,
  powerDescription,
  powerUnitLabels,
  type Tariff,
} from "@/lib/domain";
import { estimatedCharges } from "@/lib/charge-estimates";
import type { TariffPeriod } from "@/lib/tariff-periods";
import { usePowerComparisonUnit } from "./use-power-comparison-unit";

const price = (value: string) => value.replace(".", ",") || "—";

export default function TariffPriceComparison({
  periods,
}: {
  periods: TariffPeriod[];
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    const current = periods.find((p) => p.current);
    const previous = periods
      .filter((p) => !p.current)
      .sort((a, b) => b.end.localeCompare(a.end))[0];
    return [current, previous].filter((p) => p !== undefined).map((p) => p.id);
  });
  const selectedIds = selected.filter((id) => periods.some((p) => p.id === id));
  const records = periods.filter((p) => selectedIds.includes(p.id));
  const [unit, setUnit] = usePowerComparisonUnit("day");
  const byPeriod = records.some((p) => p.tariff.kind !== "fixed");
  const row = (
    label: string,
    unitLabel: string,
    render: (tariff: Tariff) => ReactNode,
  ) => (
    <tr key={label}>
      <th scope="row">
        {label}
        <small aria-hidden="true">{unitLabel}</small>
      </th>
      {records.map((p) => (
        <td key={p.id} className={p.current ? "is-current" : undefined}>
          {render(p.tariff)}
          {unitLabel && <span className="sr-only"> {unitLabel}</span>}
        </td>
      ))}
    </tr>
  );
  return (
    <section className="history-price-comparison">
      <button
        className="history-comparison-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <ArrowLeftRight size={16} />
        {open ? "Ocultar comparación" : "Comparar precios"}
        <span aria-hidden="true">Hasta 3 tarifas</span>
        <ChevronDown size={16} className="comparison-chevron" />
      </button>
      {open && (
        <div id={id} className="history-comparison-body">
          <div className="history-comparison-toolbar">
            <p>
              Elige hasta tres períodos. <span>Precios sin impuestos.</span>
            </p>
            <label className="history-power-unit">
              Potencia en
              <select
                aria-label="Comparar potencia en"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Tariff["powerUnit"])}
              >
                <option value="day">€/kW/día</option>
                <option value="month">€/kW/mes</option>
                <option value="year">€/kW/año</option>
              </select>
            </label>
          </div>
          <fieldset className="history-comparison-selection">
            <legend className="sr-only">Períodos que quieres comparar</legend>
            {periods.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  disabled={
                    selectedIds.length >= 3 && !selectedIds.includes(p.id)
                  }
                  onChange={() =>
                    setSelected(
                      selectedIds.includes(p.id)
                        ? selectedIds.filter((id) => id !== p.id)
                        : [...selectedIds, p.id],
                    )
                  }
                  aria-label={`Comparar ${p.tariff.name} · ${shortDate(p.start)}`}
                />
                <span>
                  {p.tariff.name}
                  <small>
                    {shortDate(p.start)} →{" "}
                    {p.current ? "actual" : shortDate(p.end)}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          {records.length ? (
            <>
              <div
                className="history-comparison-scroll"
                role="region"
                aria-label="Precios históricos, desplazamiento horizontal"
                tabIndex={0}
              >
                <table
                  className="history-comparison-table"
                  aria-label="Precios de tus tarifas"
                >
                  <thead>
                    <tr>
                      <th scope="col">Precio contratado</th>
                      {records.map((p) => (
                        <th
                          scope="col"
                          key={p.id}
                          className={p.current ? "is-current" : undefined}
                        >
                          <span className="history-column-status">
                            {p.current ? "Actual" : "Anterior"}
                          </span>
                          <strong>{p.tariff.name}</strong>
                          <span>
                            {p.tariff.provider || "Sin comercializadora"}
                          </span>
                          <small>
                            {shortDate(p.start)} →{" "}
                            {p.current ? "hoy" : shortDate(p.end)}
                          </small>
                          {byPeriod && p.tariff.kind === "fixed" && (
                            <small>Precio único las 24 h</small>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byPeriod ? (
                      <>
                        {row("Energía · Punta", "€/kWh", (t) =>
                          price(t.energyPeak),
                        )}
                        {row("Energía · Llano", "€/kWh", (t) =>
                          price(
                            t.kind === "fixed" ? t.energyPeak : t.energyFlat,
                          ),
                        )}
                        {row("Energía · Valle", "€/kWh", (t) =>
                          price(
                            t.kind === "fixed" ? t.energyPeak : t.energyValley,
                          ),
                        )}
                      </>
                    ) : (
                      row("Energía · 24 h", "€/kWh", (t) => price(t.energyPeak))
                    )}
                    {row("Potencia", powerUnitLabels[unit], (t) =>
                      formatPowerPrice(comparablePowerPrice(t, unit)),
                    )}
                    {row("Alquiler de contador", "€/día", (t) =>
                      price(t.meterDay),
                    )}
                    {row("Bono social", "€/día", (t) => price(t.socialDay))}
                    {row("Coste SNOEE", "€/kWh", (t) => price(t.snoeeKwh))}
                    {row("Servicios", "€/mes", (t) => price(t.servicesMonth))}
                    {records.some((p) => estimatedCharges(p.tariff)) &&
                      row("Cargos estimados", "", (t) => (
                        <span className="history-estimate">
                          {estimatedCharges(t) || "Ninguno"}
                        </span>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="history-comparison-note">
                Potencia calculada con 1 kW en cada período. Son precios
                unitarios, no el importe de tu factura.
              </p>
              <details className="history-original-prices">
                <summary>
                  <ChevronDown size={14} /> Ver precios originales de potencia
                </summary>
                <dl>
                  {records.map((p) => (
                    <div key={p.id}>
                      <dt>
                        {p.tariff.name} · {shortDate(p.start)}
                      </dt>
                      <dd>{powerDescription(p.tariff)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </>
          ) : (
            <p className="history-comparison-note">
              Selecciona un período para ver sus precios.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
