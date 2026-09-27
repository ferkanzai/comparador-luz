import {
  comparablePowerPrice,
  decimalComma,
  formatPowerPrice,
  money,
  powerDescription,
  powerUnitLabels,
  type Tariff,
} from "@/lib/domain";
import { cents } from "@/lib/calculator";
import { formatTariffPrice } from "@/lib/tariff-price-format";
import { cn } from "@/lib/utils";

export function EnergyRates({
  tariff,
  compact = false,
  className,
}: {
  tariff: Tariff;
  compact?: boolean;
  className?: string;
}) {
  const rates =
    tariff.kind === "fixed"
      ? [["24 h", tariff.energyPeak]]
      : [
          ["Punta", tariff.energyPeak],
          ["Llano", tariff.energyFlat],
          ["Valle", tariff.energyValley],
        ];
  return (
    <dl
      className={cn(
        "m-0 flex flex-col gap-1 text-xs/[inherit] text-muted-foreground tabular-nums",
        className,
      )}
    >
      {rates.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt>{label}</dt>
          <dd className="m-0 whitespace-nowrap text-foreground">
            {compact ? formatTariffPrice(value) : decimalComma(value)}{" "}
            <span className="text-3xs text-muted-foreground">€/kWh</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const powerSizes = {
  table: ["text-2xs", "text-2xs"],
  finalist: ["text-xs", "text-2xs"],
  detail: ["text-sm", "text-xs"],
} as const;

export function PowerRates({
  tariff,
  unit,
  size = "table",
}: {
  tariff: Tariff;
  unit: Tariff["powerUnit"];
  size?: keyof typeof powerSizes;
}) {
  const [text, note] = powerSizes[size];
  return (
    <div className={cn("text-muted-foreground tabular-nums", text)}>
      <div>
        <strong className="font-[550] text-foreground">
          {formatPowerPrice(comparablePowerPrice(tariff, unit))}
        </strong>{" "}
        {powerUnitLabels[unit]}
      </div>
      <p className={cn("m-0 mt-1.5 leading-[1.45]", note)}>
        Original: {powerDescription(tariff)}
      </p>
    </div>
  );
}

export function CostDifference({
  total,
  baseline,
  current,
}: {
  total: number;
  baseline?: number;
  current: boolean;
}) {
  const note = "mt-1.5 block text-2xs tabular-nums";
  const reference = cn(note, "text-muted-foreground");
  if (current) return <span className={reference}>Tu referencia</span>;
  if (baseline === undefined)
    return <span className={reference}>Sin tarifa de referencia</span>;
  const difference = cents(baseline - total);
  return (
    <span
      className={
        difference > 0
          ? cn(note, "font-semibold text-success")
          : difference < 0
            ? cn(note, "text-caution")
            : reference
      }
    >
      {difference === 0
        ? "Mismo coste"
        : `${difference > 0 ? "Ahorras" : "Pagas más"} ${money(Math.abs(difference))}`}
    </span>
  );
}
