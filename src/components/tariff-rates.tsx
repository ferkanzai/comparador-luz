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

export function EnergyRates({
  tariff,
  compact = false,
}: {
  tariff: Tariff;
  compact?: boolean;
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
    <dl className="comparison-rates">
      {rates.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {compact ? formatTariffPrice(value) : decimalComma(value)}{" "}
            <span>€/kWh</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PowerRates({
  tariff,
  unit,
}: {
  tariff: Tariff;
  unit: Tariff["powerUnit"];
}) {
  return (
    <div className="comparison-power">
      <div>
        <strong>{formatPowerPrice(comparablePowerPrice(tariff, unit))}</strong>{" "}
        {powerUnitLabels[unit]}
      </div>
      <p>Original: {powerDescription(tariff)}</p>
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
  if (current) return <span className="cost-reference">Tu referencia</span>;
  if (baseline === undefined)
    return <span className="cost-reference">Sin tarifa de referencia</span>;
  const difference = cents(baseline - total);
  return (
    <span
      className={
        difference > 0
          ? "cost-saving"
          : difference < 0
            ? "cost-increase"
            : "cost-reference"
      }
    >
      {difference === 0
        ? "Mismo coste"
        : `${difference > 0 ? "Ahorras" : "Pagas más"} ${money(Math.abs(difference))}`}
    </span>
  );
}
