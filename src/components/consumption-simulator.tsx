import { RotateCcw, X } from "lucide-react";
import type { ConsumptionSimulation } from "@/lib/consumption-simulation";
import type { Consumption } from "@/lib/domain";
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
  const periods = ["Punta", "Llano", "Valle"];
  const quantities = consumption
    ? [consumption.peakKwh, consumption.flatKwh, consumption.valleyKwh]
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
        Sube o baja el total conservando el reparto, o cambia los porcentajes
        sin cambiar los kWh. Se aplica a todas las tarifas.
      </p>
      <div className="simulator-inputs">
        <div className="simulator-total">
          <Field
            label="Consumo total simulado"
            value={value.total}
            onChange={(total) => onChange({ ...value, total })}
            unit="kWh"
            decimal
            maxLength={24}
          />
          <span className="small muted">Para los mismos días del perfil</span>
        </div>
        <div className="simulator-distribution">
          {periods.map((period, index) => (
            <div key={period}>
              <Field
                label={`${period} simulado`}
                value={value.shares[index]}
                onChange={(share) => {
                  const shares: ConsumptionSimulation["shares"] = [
                    ...value.shares,
                  ];
                  shares[index] = share;
                  onChange({ ...value, shares });
                }}
                unit="%"
                decimal
                maxLength={24}
              />
              <span className={`period-quantity period-${index}`}>
                {quantities
                  ? `${quantities[index].replace(".", ",")} kWh`
                  : "— kWh"}
              </span>
            </div>
          ))}
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
