import { syncStatusLabel } from "@/lib/sync-status";
import type { SyncSnapshot } from "@/lib/workspace-sync";

export default function WorkspaceStatus({
  loaded,
  signedIn,
  snapshot: { status, stored, error, issue },
  onRetry,
}: {
  loaded: boolean;
  signedIn: boolean;
  snapshot: Pick<SyncSnapshot, "status" | "stored" | "error" | "issue">;
  onRetry: () => void;
}) {
  return (
    <span className="workspace-status" title={error || issue || undefined}>
      <span
        className={`status-dot ${signedIn && status !== "saved" ? "unsaved" : ""}`}
      />
      {loaded ? syncStatusLabel(status, stored) : "Cargando…"}
      {status === "error" && (
        <button className="link-button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </span>
  );
}
