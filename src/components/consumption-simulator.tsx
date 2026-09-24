import { RotateCcw, X } from "lucide-react";
import type { ConsumptionSimulation } from "@/lib/consumption-simulation";
import { numberOf, type Consumption } from "@/lib/domain";
import { Field } from "./ui";
import { Button } from "@/components/ui/button";

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
      className="-mt-3.5 mb-7 rounded-lg border border-t-[3px] border-border-accent border-t-primary bg-card px-6 py-5 max-[600px]:p-4"
      aria-label="Simulación de consumo"
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <span className="text-3xs font-semibold tracking-[1.65px] text-primary">
            PRUEBA OTRA FORMA DE CONSUMIR
          </span>
          <h3 className="m-0 mt-1 font-heading text-xl font-bold tracking-[-0.25px]">
            ¿Y si cambias tu consumo?
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar simulador y restablecer"
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </div>
      <p className="m-0 text-sm-plus text-muted-foreground">
        Introduce los kWh de punta, llano y valle, como aparecen en tu factura.
        El total se suma automáticamente y todas las tarifas se recalculan.
      </p>
      <div className="my-5 grid grid-cols-[minmax(0,3fr)_minmax(180px,1fr)] gap-10 max-[600px]:grid-cols-1 max-[600px]:gap-4 [&_input]:tabular-nums">
        <div className="grid grid-cols-3 gap-5 max-[600px]:gap-2.5">
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
        <div className="self-stretch border-l border-border pl-6 max-[600px]:border-t max-[600px]:border-l-0 max-[600px]:pt-3 max-[600px]:pl-0">
          <span className="mb-1 block text-xs text-muted-foreground">
            Total simulado
          </span>
          <output
            aria-label="Consumo total simulado"
            className="block font-heading text-2xl font-[650] wrap-anywhere tabular-nums"
          >
            {total === null
              ? "—"
              : total.toLocaleString("es-ES", {
                  maximumFractionDigits: 6,
                })}{" "}
            kWh
          </output>
          <small className="block text-3xs text-muted-foreground">
            Para los mismos días del perfil
          </small>
        </div>
      </div>
      {error && (
        <p className="m-0 mb-3 text-xs-plus text-caution" role="status">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-3.5 max-[600px]:flex-col max-[600px]:items-start">
        <span className="text-2xs text-primary">
          {active
            ? "Simulación activa · Tu perfil guardado no cambia"
            : "Tu perfil es el punto de partida"}
        </span>
        <div className="flex items-center gap-6 max-[600px]:w-full max-[600px]:justify-between max-[600px]:gap-2.5">
          <Button variant="link" size="inline" onClick={onReset}>
            <RotateCcw size={14} />
            Restablecer
          </Button>
          <Button
            size="sm"
            disabled={!active || !consumption}
            onClick={onAdopt}
          >
            Usar este consumo
          </Button>
        </div>
      </div>
    </section>
  );
}
