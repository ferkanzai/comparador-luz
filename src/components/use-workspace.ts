"use client";
import { useEffect, useRef, useState } from "react";
import { emptyWorkspace, workspaceSchema, type Workspace } from "@/lib/domain";
import {
  mergeGuestComparison,
  migrateDraft,
  readDraft,
  recoverDraft,
  removeDraft,
  writeDraft,
  type WorkspaceDraft,
} from "@/lib/workspace-draft";
import {
  WorkspaceSync,
  SyncError,
  type SyncSnapshot,
} from "@/lib/workspace-sync";

export type InitialWorkspace = Promise<
  { data: Workspace; version: number } | { error: string }
>;

function browserDraft(owner: string) {
  try {
    return migrateDraft(localStorage, sessionStorage, owner);
  } catch {
    // Access to either storage object itself can be denied by the browser.
    try {
      return readDraft(localStorage, owner);
    } catch {
      /* Try the legacy draft. */
    }
    try {
      return readDraft(sessionStorage, owner);
    } catch {
      return null;
    }
  }
}
function persist(owner: string, draft: WorkspaceDraft) {
  try {
    return writeDraft(localStorage, owner, draft);
  } catch {
    return false;
  }
}
async function readAccount(signal: AbortSignal) {
  const response = await fetch("/api/workspace", { signal, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new SyncError(response.status, body.error);
  return {
    data: workspaceSchema.parse(body.data),
    version: body.version as number,
  };
}
async function send(data: Workspace, version: number) {
  const response = await fetch("/api/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, version }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json();
  if (!response.ok) throw new SyncError(response.status, body.error);
  return body.version as number;
}

export function useWorkspace(
  userId?: string,
  initialWorkspace?: InitialWorkspace,
) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(() => ({
    data: emptyWorkspace(),
    stored: true,
    status: "local",
    error: "",
    issue: "",
  }));
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [generation, setGeneration] = useState(0);
  const controller = useRef<WorkspaceSync | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    const owner = userId ?? "guest";
    const own = browserDraft(owner);
    let sync: WorkspaceSync | null = null;
    function start(
      initial: {
        data: Workspace;
        version: number;
        saved: Workspace | null;
        conflict: boolean;
        pending?: Workspace;
      },
      guest: WorkspaceDraft | null = null,
    ) {
      if (abort.signal.aborted) return;
      sync = new WorkspaceSync({
        ...initial,
        persist: (draft) => persist(owner, draft),
        send: userId ? send : undefined,
        readCurrent: userId
          ? () => readAccount(AbortSignal.timeout(20_000))
          : undefined,
        onChange: setSnapshot,
      });
      controller.current = sync;
      if (userId || own) {
        sync.update(
          guest ? mergeGuestComparison(initial.data, guest.data) : initial.data,
        );
      } else {
        // Visiting the empty comparator must not replace account consumption on login.
        setSnapshot(sync.snapshot);
      }
      if (guest && sync.snapshot.stored) {
        try {
          removeDraft(localStorage, "guest");
        } catch {
          /* Browser denied storage. */
        }
        try {
          removeDraft(sessionStorage, "guest");
        } catch {
          /* Browser denied storage. */
        }
      }
      setLoadError("");
      // Reset presentation state only once the replacement workspace is installed.
      setGeneration((value) => value + 1);
      setLoaded(true);
    }
    if (!userId) {
      start({
        data: own?.data ?? emptyWorkspace(),
        version: 0,
        saved: null,
        conflict: false,
      });
    } else {
      // The first read starts on the server while the browser loads the app.
      // Explicit retries/reloads must fetch a fresh version, not replay it.
      const account =
        reload === 0 && initialWorkspace
          ? Promise.resolve(initialWorkspace).then((result) => {
              if ("error" in result) throw new Error(result.error);
              return result;
            })
          : readAccount(abort.signal);
      account
        .then((server) =>
          start(recoverDraft(server, own), browserDraft("guest")),
        )
        .catch((error) => {
          if (abort.signal.aborted) return;
          if (own) {
            start({
              data: own.data,
              version: own.version,
              saved: own.base ?? null,
              conflict: false,
              pending: own.pending,
            });
          } else {
            setLoadError(
              error instanceof Error
                ? error.message
                : "No se han podido cargar tus datos.",
            );
          }
        });
    }
    const retry = () => sync?.retry();
    window.addEventListener("online", retry);
    return () => {
      abort.abort();
      sync?.dispose();
      controller.current = null;
      window.removeEventListener("online", retry);
    };
  }, [userId, reload, initialWorkspace]);

  async function useAccountVersion() {
    try {
      const server = await readAccount(AbortSignal.timeout(20_000));
      // The existing copy stays intact if reading the account fails.
      if (!persist(userId!, { ...server, base: server.data })) {
        setLoadError(
          "No se pudo guardar la copia de tu cuenta en este dispositivo.",
        );
        return;
      }
      controller.current?.dispose();
      setReload((n) => n + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se han podido cargar tus datos.",
      );
    }
  }
  return {
    ...snapshot,
    loaded,
    loadError,
    generation,
    reload: () => setReload((n) => n + 1),
    update: (data: Workspace) => controller.current?.update(data),
    retry: () => controller.current?.retry(),
    useAccountVersion,
  };
}
