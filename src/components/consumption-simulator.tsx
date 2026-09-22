import { RotateCcw, X } from "lucide-react";
import type { ConsumptionSimulation } from "@/lib/consumption-simulation";
import { numberOf, type Consumption } from "@/lib/domain";
import { Field } from "./ui";

export default function ConsumptionSimulator({
  value,
  consumption,
  error,
  active,
  onChange,
  onReset,
  onAdopt,
  onClose,
}: {
  value: ConsumptionSimulation;
  consumption: Consumption | null;
  error: string;
  active: boolean;
  onChange: (value: ConsumptionSimulation) => void;
  onReset: () => void;
  onAdopt: () => void;
  onClose: () => void;
}) {
  const periods = [
    ["peakKwh", "Punta"],
    ["flatKwh", "Llano"],
    ["valleyKwh", "Valle"],
  ] as const;
  const total = consumption
    ? Object.values(consumption).reduce(
        (sum, value) => sum + numberOf(value),
        0,
      )
    : null;
  return (
    <section
      className="consumption-simulator"
      aria-label="Simulación de consumo"
    >
      <div className="simulator-heading">
        <div>
          <span className="eyebrow">PRUEBA OTRA FORMA DE CONSUMIR</span>
          <h3>¿Y si cambias tu consumo?</h3>
        </div>
        <button
          className="icon-button"
          aria-label="Cerrar simulador y restablecer"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <p className="small muted">
        Introduce los kWh de punta, llano y valle, como aparecen en tu factura.
        El total se suma automáticamente y todas las tarifas se recalculan.
      </p>
      <div className="simulator-inputs">
        <div className="simulator-distribution">
          {periods.map(([key, period]) => (
            <Field
              key={key}
              label={`${period} simulado`}
              value={value[key]}
              onChange={(kwh) => onChange({ ...value, [key]: kwh })}
              unit="kWh"
              decimal
              maxLength={24}
            />
          ))}
        </div>
        <div className="simulator-total">
          <span>Total simulado</span>
          <output aria-label="Consumo total simulado">
            {total === null
              ? "—"
              : total.toLocaleString("es-ES", {
                  maximumFractionDigits: 6,
                })}{" "}
            kWh
          </output>
          <small>Para los mismos días del perfil</small>
        </div>
      </div>
      {error && (
        <p className="simulation-error" role="status">
          {error}
        </p>
      )}
      <div className="simulator-footer">
        <span>
          {active
            ? "Simulación activa · Tu perfil guardado no cambia"
            : "Tu perfil es el punto de partida"}
        </span>
        <div>
          <button className="text-link" onClick={onReset}>
            <RotateCcw size={14} />
            Restablecer
          </button>
          <button
            className="button primary small-button"
            disabled={!active || !consumption}
            onClick={onAdopt}
          >
            Usar este consumo
          </button>
        </div>
      </div>
    </section>
  );
}
