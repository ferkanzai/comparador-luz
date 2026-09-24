import { saveStatusLabel, type SaveStatus } from "@/lib/sync-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WorkspaceStatus({
  loaded,
  status,
  error,
  onRetry,
}: {
  loaded: boolean;
  status: SaveStatus;
  error: string;
  onRetry: () => void;
}) {
  return (
    <span
      className="flex items-center gap-2 text-sm/[1.6] text-muted-foreground max-[800px]:hidden"
      title={error || undefined}
    >
      <span
        className={cn(
          "inline-block size-1.5 shrink-0 rounded-full bg-ring",
          status !== "local" && status !== "saved" && "bg-warning-strong",
        )}
      />
      {loaded ? saveStatusLabel(status) : "Cargando…"}
      {status === "error" && (
        <Button variant="link" size="inline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </span>
  );
}
