import { saveStatusLabel, type SaveStatus } from "@/lib/sync-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WorkspaceStatus({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus;
  error: string;
  onRetry: () => void;
}) {
  return (
    <span
      className="flex items-center gap-2 text-sm/[1.6] text-muted-foreground"
      title={error || undefined}
    >
      <span
        className={cn(
          "inline-block size-1.5 shrink-0 rounded-full bg-ring",
          status !== "local" && status !== "saved" && "bg-warning-strong",
        )}
      />
      {saveStatusLabel(status)}
      {status === "error" && (
        <Button variant="link" size="inline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </span>
  );
}
