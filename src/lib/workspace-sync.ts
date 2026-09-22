import { workspaceSchema, type Workspace } from "./domain";
import type { WorkspaceDraft } from "./workspace-draft";

export class SyncError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type SyncSnapshot = {
  data: Workspace;
  stored: boolean;
  status:
    "local" | "saved" | "pending" | "saving" | "invalid" | "error" | "conflict";
  error: string;
};
type Options = {
  data: Workspace;
  version: number;
  saved: Workspace | null;
  conflict?: boolean;
  pending?: Workspace;
  persist: (draft: WorkspaceDraft) => boolean;
  send?: (data: Workspace, version: number) => Promise<number>;
  readCurrent?: () => Promise<{ data: Workspace; version: number }>;
  onChange: (snapshot: SyncSnapshot) => void;
};

/** One writer per mounted workspace; local durability precedes every network write. */
export class WorkspaceSync {
  private data: Workspace;
  private saved: Workspace | null;
  private version: number;
  private stored = true;
  private inFlight = false;
  private pending?: Workspace;
  private blocked: boolean;
  private disposed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private error = "";
  private retryDelay = 5000;

  constructor(private options: Options) {
    this.data = options.data;
    this.saved = options.saved;
    this.version = options.version;
    this.blocked = options.conflict ?? false;
    this.pending = options.pending;
  }
  get snapshot(): SyncSnapshot {
    return {
      data: this.data,
      stored: this.stored,
      status: !this.options.send
        ? "local"
        : this.blocked
          ? "conflict"
          : this.inFlight
            ? "saving"
            : this.equal(this.data, this.saved) && !this.pending
              ? "saved"
              : !workspaceSchema.safeParse(this.data).success
                ? "invalid"
                : this.error
                  ? "error"
                  : "pending",
      error: this.error,
    };
  }
  private equal(a: Workspace, b: Workspace | null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  private persist() {
    this.stored = this.options.persist({
      data: this.data,
      version: this.version,
      ...(this.saved ? { base: this.saved } : {}),
      ...(this.pending ? { pending: this.pending } : {}),
    });
    this.options.onChange(this.snapshot);
  }
  update(data: Workspace) {
    if (this.disposed) return;
    this.data = data;
    this.error = "";
    this.retryDelay = 5000;
    this.persist();
    this.schedule();
  }
  private schedule(delay = 800) {
    clearTimeout(this.timer);
    if (
      this.disposed ||
      this.inFlight ||
      this.blocked ||
      !this.options.send ||
      (this.equal(this.data, this.saved) && !this.pending) ||
      !workspaceSchema.safeParse(this.data).success
    )
      return;
    this.timer = setTimeout(() => {
      void this.flush();
    }, delay);
  }
  retry() {
    this.error = "";
    this.persist();
    this.schedule(0);
  }
  private async flush() {
    if (this.disposed || this.inFlight || this.blocked || !this.options.send)
      return;
    const parsed = workspaceSchema.safeParse(this.data);
    if (!parsed.success || (this.equal(this.data, this.saved) && !this.pending))
      return;
    const sent = parsed.data;
    const previousPending = this.pending;
    this.inFlight = true;
    this.pending = sent;
    this.error = "";
    this.persist();
    let retry = true;
    try {
      const version = await this.options.send(sent, this.version);
      if (this.disposed) return;
      this.version = version;
      this.saved = sent;
      this.pending = undefined;
      this.retryDelay = 5000;
    } catch (error) {
      if (this.disposed) return;
      this.error =
        error instanceof Error ? error.message : "No se pudo sincronizar.";
      if (error instanceof SyncError) {
        this.blocked = error.status === 409;
        retry = error.status >= 500 || error.status === 429;
        if (this.blocked && this.options.readCurrent) {
          try {
            const server = await this.options.readCurrent();
            if (this.disposed) return;
            if (
              server.version === this.version + 1 &&
              (this.equal(server.data, sent) ||
                this.equal(server.data, previousPending ?? null))
            ) {
              // An earlier request committed but its response was lost.
              this.version = server.version;
              this.saved = server.data;
              this.pending = undefined;
              this.blocked = false;
              this.error = "";
              retry = true;
            }
          } catch {
            /* Keep the local copy and stop writes until the conflict is resolved. */
          }
        }
      }
    } finally {
      this.inFlight = false;
      if (!this.disposed) {
        // Persist the latest edits with the acknowledged version, never the sent snapshot.
        this.persist();
        if (retry) {
          this.schedule(this.error ? this.retryDelay : 800);
          if (this.error)
            this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
        }
      }
    }
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
