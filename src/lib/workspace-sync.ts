import { workspaceSchema, type Workspace } from "./domain";
import type { WorkspaceDraft } from "./workspace-draft";
import { describeWorkspaceIssue } from "./sync-status";

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
  /** What to fix before an "invalid" workspace can sync; empty otherwise. */
  issue: string;
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

// Workspaces are immutable, so serialization and validity are cached per object.
const serialized = new WeakMap<Workspace, string>();
const validated = new WeakMap<
  Workspace,
  ReturnType<typeof workspaceSchema.safeParse>
>();
function serialize(data: Workspace) {
  let json = serialized.get(data);
  if (json === undefined) serialized.set(data, (json = JSON.stringify(data)));
  return json;
}
function validate(data: Workspace) {
  let result = validated.get(data);
  if (!result) validated.set(data, (result = workspaceSchema.safeParse(data)));
  return result;
}

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
  private draftTimer?: ReturnType<typeof setTimeout>;
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
    const base = { data: this.data, stored: this.stored, error: this.error };
    if (!this.options.send) return { ...base, status: "local", issue: "" };
    if (this.blocked) return { ...base, status: "conflict", issue: "" };
    if (this.inFlight) return { ...base, status: "saving", issue: "" };
    if (this.equal(this.data, this.saved) && !this.pending)
      return { ...base, status: "saved", issue: "" };
    const parsed = validate(this.data);
    if (!parsed.success)
      return {
        ...base,
        status: "invalid",
        issue: describeWorkspaceIssue(this.data, parsed.error.issues[0]),
      };
    return { ...base, status: this.error ? "error" : "pending", issue: "" };
  }
  private equal(a: Workspace, b: Workspace | null) {
    return b !== null && (a === b || serialize(a) === serialize(b));
  }
  /** Writes any debounced local copy now, e.g. before the page is hidden. */
  saveDraft() {
    if (this.draftTimer === undefined) return;
    this.persist();
  }
  private persistSoon() {
    // Typing fires an update per keystroke; the local copy only needs the last one.
    if (this.draftTimer === undefined)
      this.draftTimer = setTimeout(() => this.persist(), 250);
    this.options.onChange(this.snapshot);
  }
  private persist() {
    clearTimeout(this.draftTimer);
    this.draftTimer = undefined;
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
    this.persistSoon();
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
      !validate(this.data).success
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
    const parsed = validate(this.data);
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
    this.saveDraft();
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
