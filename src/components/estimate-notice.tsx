import type { Tariff } from "@/lib/domain";
import { estimatedCharges } from "@/lib/charge-estimates";

export default function EstimateNotice({ tariff }: { tariff: Tariff }) {
  const charges = estimatedCharges(tariff);
  return charges ? (
    <p className="estimate-note small">
      Cálculo aproximado · {charges} con valores de referencia.
    </p>
  ) : null;
}
