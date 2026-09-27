"use client";
import { useEffect, useRef, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  appSchemaHeader,
  appSchemaVersion,
  emptyWorkspace,
  profileSchema,
  workspaceSchema,
  type Profile,
  type Workspace,
} from "@/lib/domain";
import {
  readGuestDraft,
  removeDraft,
  writeGuestDraft,
} from "@/lib/workspace-draft";
import {
  profileRequest,
  type SaveRequest,
  type WorkspaceCommand,
} from "@/lib/workspace-commands";
import type { SaveStatus } from "@/lib/sync-status";
import { notify } from "./feedback-notice";

export type InitialWorkspace = Promise<{ data: Workspace } | { error: string }>;

export class SaveError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function readAccount() {
  const response = await fetch("/api/workspace", { cache: "no-store" }).catch(
    () => {
      throw new SaveError(0, offline);
    },
  );
  const body = await response.json();
  if (!response.ok) throw new SaveError(response.status, body.error);
  return workspaceSchema.parse(body.data);
}
const offline =
  "No se ha podido conectar. Revisa tu conexión y vuelve a intentarlo.";
async function send(requests: SaveRequest[], keepalive = false) {
  for (const { method, path, body } of requests) {
    const response = await fetch(path, {
      method,
      keepalive,
      headers: {
        [appSchemaHeader]: String(appSchemaVersion),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }).catch(() => {
      // The browser's own message ("Failed to fetch") is in English.
      throw new SaveError(0, offline);
    });
    if (!response.ok) {
      const message = await response
        .json()
        .then((b: { error?: string }) => b.error)
        .catch(() => undefined);
      throw new SaveError(
        response.status,
        message ?? "No se ha podido guardar el cambio.",
      );
    }
  }
}

/**
 * The workspace on screen and the way to change it. A guest's lives in this
 * browser; an account's is saved record by record, and the last save wins
 * (docs/adr/0003). `run` throws when the action can't apply, as the pure
 * actions do.
 */
export function useWorkspace(userId?: string, initial?: InitialWorkspace) {
  const guest = useGuestWorkspace(!userId);
  const account = useAccountWorkspace(userId, initial);
  return userId ? account : guest;
}

function useGuestWorkspace(enabled: boolean) {
  const [data, setData] = useState(emptyWorkspace);
  const [loaded, setLoaded] = useState(false);
  const [stored, setStored] = useState(true);
  const latest = useRef(data);
  const unsaved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function save() {
    clearTimeout(timer.current);
    if (!unsaved.current) return;
    unsaved.current = false;
    setStored(writeGuestDraft(localStorage, latest.current));
  }
  useEffect(() => {
    if (!enabled) return;
    try {
      const draft = readGuestDraft(localStorage);
      if (draft) {
        latest.current = draft;
        // Restoring the browser copy after hydration is intended here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData(draft);
      }
    } catch {
      /* The browser denied storage; start empty. */
    }
    setLoaded(true);
    const hidden = () => save();
    window.addEventListener("pagehide", hidden);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      save();
      window.removeEventListener("pagehide", hidden);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [enabled]);
  return {
    data,
    loaded,
    loadError: "",
    status: (stored ? "local" : "error") satisfies SaveStatus as SaveStatus,
    error: stored ? "" : "No se pudo guardar en este dispositivo.",
    reload: () => {},
    run(command: WorkspaceCommand) {
      const next = command.apply(latest.current);
      latest.current = next;
      setData(next);
      // Typing fires a change per keystroke; the browser copy only needs the last one.
      unsaved.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(save, 250);
    },
  };
}

const retryable = (error: unknown) =>
  !(error instanceof SaveError) || error.status >= 500 || error.status === 429;

function useAccountWorkspace(userId?: string, initial?: InitialWorkspace) {
  const client = useQueryClient();
  const key = ["workspace", userId];
  // The first read starts on the server while the browser loads the app.
  const seed = useRef(initial);
  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const first = seed.current;
      seed.current = undefined;
      if (!first) return readAccount();
      const result = await first;
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
  });
  const [error, setError] = useState("");
  const [outdated, setOutdated] = useState(false);
  const saving = useIsMutating({ mutationKey: key });
  const save = useMutation({
    mutationKey: key,
    mutationFn: (requests: SaveRequest[]) => send(requests),
    retry: (count, failure) => retryable(failure) && count < 2,
    onSuccess: () => setError(""),
    onError: (failure) => {
      if (failure instanceof SaveError && failure.status === 426)
        setOutdated(true);
      else notify(failure.message, "error");
      setError(failure.message);
    },
    onSettled: () => {
      // Refetch once no other save is still on its way, so none is undone on screen.
      if (client.isMutating({ mutationKey: key }) === 1)
        void client.invalidateQueries({ queryKey: key });
    },
  });

  // Profile typing stays on screen and goes out after a pause, one PATCH with
  // the valid fields, so a refetch never undoes what is being typed.
  const [typed, setTyped] = useState<Profile | null>(null);
  const typedRef = useRef<Profile | null>(null);
  const profileTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function sendProfile(keepalive = false) {
    clearTimeout(profileTimer.current);
    const local = typedRef.current;
    const server = client.getQueryData<Workspace>(key)?.profile;
    if (!local || !server) return;
    const valid = Object.fromEntries(
      Object.entries(local).filter(
        ([name, value]) =>
          profileSchema.shape[name as keyof Profile].safeParse(value).success,
      ),
    ) as Partial<Profile>;
    const requests = profileRequest(server, { ...server, ...valid });
    if (Object.keys(valid).length === Object.keys(local).length) {
      typedRef.current = null;
      setTyped(null);
    }
    if (!requests.length) return;
    client.setQueryData<Workspace>(
      key,
      (w) => w && { ...w, profile: { ...w.profile, ...valid } },
    );
    if (keepalive) void send(requests, true);
    else save.mutate(requests);
  }
  useEffect(() => {
    const hidden = () => sendProfile(true);
    window.addEventListener("pagehide", hidden);
    return () => window.removeEventListener("pagehide", hidden);
  });

  // On sign-in, a guest's workspace moves into the account once.
  const imported = useRef(false);
  useEffect(() => {
    if (!userId || !query.isSuccess || imported.current) return;
    imported.current = true;
    try {
      removeDraft(localStorage, userId);
      removeDraft(sessionStorage, userId);
      removeDraft(sessionStorage);
    } catch {
      /* Storage unavailable. */
    }
    let guest: Workspace | null = null;
    try {
      guest = readGuestDraft(localStorage);
    } catch {
      return;
    }
    if (!guest) return;
    save.mutate(
      [{ method: "POST", path: "/api/import", body: { data: guest } }],
      { onSuccess: () => removeDraft(localStorage) },
    );
  }, [userId, query.isSuccess, save]);

  const data =
    query.data &&
    (typed
      ? { ...query.data, profile: { ...query.data.profile, ...typed } }
      : query.data);
  return {
    data: data ?? emptyWorkspace(),
    loaded: !!query.data,
    loadError:
      !query.data && query.error
        ? query.error.message || "No se han podido cargar tus datos."
        : "",
    status: (outdated
      ? "outdated"
      : typed && !profileSchema.safeParse(typed).success
        ? "invalid"
        : saving || typed
          ? "saving"
          : error
            ? "error"
            : "saved") satisfies SaveStatus as SaveStatus,
    error,
    reload: () => void query.refetch(),
    run(command: WorkspaceCommand) {
      const current = client.getQueryData<Workspace>(key);
      if (!current) return;
      const before = typedRef.current
        ? { ...current, profile: typedRef.current }
        : current;
      const after = command.apply(before);
      if (command.profile) {
        typedRef.current = after.profile;
        setTyped(after.profile);
        clearTimeout(profileTimer.current);
        profileTimer.current = setTimeout(() => sendProfile(), 800);
        return;
      }
      // Anything typed goes first, so the action's own profile change applies on top.
      if (typedRef.current) sendProfile();
      void client.cancelQueries({ queryKey: key });
      client.setQueryData(key, after);
      const requests = command.requests(before, after);
      if (requests.length) save.mutate(requests);
    },
  };
}
