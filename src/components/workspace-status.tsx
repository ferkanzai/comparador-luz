import { saveStatusLabel, type SaveStatus } from "@/lib/sync-status";
import { Button } from "@/components/ui/button";

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
    <span className="workspace-status" title={error || undefined}>
      <span
        className={`status-dot ${status === "local" || status === "saved" ? "" : "unsaved"}`}
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
