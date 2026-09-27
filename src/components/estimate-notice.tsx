import { TriangleAlert } from "lucide-react";
import type { Tariff } from "@/lib/domain";
import { estimatedCharges } from "@/lib/charge-estimates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function EstimateNotice({
  tariff,
  className,
}: {
  tariff: Tariff;
  className?: string;
}) {
  const charges = estimatedCharges(tariff);
  return charges ? (
    <Alert
      role="note"
      className={cn(
        "my-3 border-warning-border bg-warning-muted text-warning",
        className,
      )}
    >
      <TriangleAlert />
      <AlertDescription className="text-warning">
        Cálculo aproximado · {charges} con valores de referencia.
      </AlertDescription>
    </Alert>
  ) : null;
}
