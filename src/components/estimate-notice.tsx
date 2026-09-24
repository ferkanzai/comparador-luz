import { TriangleAlert } from "lucide-react";
import type { Tariff } from "@/lib/domain";
import { estimatedCharges } from "@/lib/charge-estimates";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EstimateNotice({ tariff }: { tariff: Tariff }) {
  const charges = estimatedCharges(tariff);
  return charges ? (
    <Alert
      role="note"
      className="estimate-note border-warning-border bg-warning-muted text-warning"
    >
      <TriangleAlert />
      <AlertDescription className="text-warning">
        Cálculo aproximado · {charges} con valores de referencia.
      </AlertDescription>
    </Alert>
  ) : null;
}
