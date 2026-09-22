"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { shortDate, type Tariff } from "@/lib/domain";
import type { TariffPeriod } from "@/lib/tariff-periods";
import { EnergyRates, PowerRates } from "./comparison-table";
import EstimateNotice from "./estimate-notice";
import { usePowerComparisonUnit } from "./use-power-comparison-unit";

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
  const row = (label: string, render: (tariff: Tariff) => ReactNode) => (
    <tr key={label}>
      <th scope="row">{label}</th>
      {records.map((p) => (
        <td key={p.id}>{render(p.tariff)}</td>
      ))}
    </tr>
  );
  return (
    <section className="panel history-price-comparison">
      <button
        className="text-link comparison-expand"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        {open ? "Ocultar comparación" : "Comparar precios"}
      </button>
      {open && (
        <div id={id}>
          <p className="muted">
            Elige hasta tres períodos para comparar sus precios sin impuestos.
          </p>
          <fieldset className="history-comparison-selection">
            <legend className="sr-only">Períodos que quieres comparar</legend>
            {periods.map((p) => (
              <label className="checkbox" key={p.id}>
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
          <label className="inline-label">
            Comparar potencia en{" "}
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
          <p className="small muted">
            Referencia de potencia: 1 kW en cada período. Comparamos precios
            unitarios, no el importe de tu factura.
          </p>
          {records.length ? (
            <div
              className="comparison-scroll"
              role="region"
              aria-label="Precios históricos, desplazamiento horizontal"
              tabIndex={0}
            >
              <table
                className="finalist-table"
                aria-label="Precios de tus tarifas"
              >
                <thead>
                  <tr>
                    <th scope="col">Precios sin impuestos</th>
                    {records.map((p) => (
                      <th scope="col" key={p.id}>
                        <span className="comparison-provider">
                          {p.tariff.provider || "Sin comercializadora"}
                        </span>
                        {p.tariff.name}
                        <span className="comparison-provider">
                          {shortDate(p.start)} →{" "}
                          {p.current ? "actual" : shortDate(p.end)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {row("Energía", (t) => (
                    <EnergyRates tariff={t} />
                  ))}
                  {row("Potencia", (t) => (
                    <PowerRates tariff={t} unit={unit} />
                  ))}
                  {row(
                    "Alquiler de contador",
                    (t) => `${t.meterDay.replace(".", ",") || "—"} €/día`,
                  )}
                  {row(
                    "Financiación del bono social",
                    (t) => `${t.socialDay.replace(".", ",") || "—"} €/día`,
                  )}
                  {row(
                    "Coste SNOEE",
                    (t) => `${t.snoeeKwh.replace(".", ",") || "—"} €/kWh`,
                  )}
                  {row(
                    "Servicios",
                    (t) => `${t.servicesMonth.replace(".", ",") || "—"} €/mes`,
                  )}
                  {row("Cargos estimados", (t) => (
                    <EstimateNotice tariff={t} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="notice">
              Selecciona un período para ver sus precios.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
