import * as z from "zod";
import { profileSchema, workspaceSchema, type Workspace } from "./domain";

// Drafts may contain an unfinished number, but server writes still use workspaceSchema.
const draftWorkspaceSchema = workspaceSchema.safeExtend({
  profile: profileSchema.extend({
    days: z.string().max(24),
    peakKwh: z.string().max(24),
    flatKwh: z.string().max(24),
    valleyKwh: z.string().max(24),
    peakKw: z.string().max(24),
    valleyKw: z.string().max(24),
    vat: z.string().max(24),
    electricityTax: z.string().max(24),
  }),
});
const draftSchema = z.object({
  data: draftWorkspaceSchema,
  version: z.number().int().nonnegative(),
  base: workspaceSchema.optional(),
  pending: workspaceSchema.optional(),
});
export type WorkspaceDraft = {
  data: Workspace;
  version: number;
  base?: Workspace;
  pending?: Workspace;
};
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = (owner: string) => `luz:comparison-draft:v1:${owner}`;
export function readDraft(
  storage: DraftStorage,
  owner: string,
): WorkspaceDraft | null {
  try {
    const result = draftSchema.safeParse(
      JSON.parse(storage.getItem(key(owner)) ?? "null"),
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function writeDraft(
  storage: DraftStorage,
  owner: string,
  draft: WorkspaceDraft,
): boolean {
  try {
    storage.setItem(key(owner), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
export function removeDraft(storage: DraftStorage, owner: string) {
  try {
    storage.removeItem(key(owner));
  } catch {
    /* The saved server version wins on reload. */
  }
}
export function migrateDraft(
  storage: DraftStorage,
  legacy: DraftStorage,
  owner: string,
): WorkspaceDraft | null {
  const current = readDraft(storage, owner);
  const previous = readDraft(legacy, owner);
  if (current) {
    removeDraft(legacy, owner);
    return current;
  }
  if (previous && writeDraft(storage, owner, previous))
    removeDraft(legacy, owner);
  return previous;
}

// Clean local copies may lag another device. Only unsynced edits need recovery.
export function recoverDraft(
  server: { data: Workspace; version: number },
  draft: WorkspaceDraft | null,
) {
  const equal = (a: Workspace | undefined, b: Workspace) =>
    JSON.stringify(a) === JSON.stringify(b);
  if (
    !draft ||
    (equal(draft.data, server.data) && !draft.pending) ||
    (!draft.pending && equal(draft.base, draft.data))
  )
    return { ...server, saved: server.data, conflict: false };
  // A request can finish after navigation or lose its response. Acknowledge only
  // that exact snapshot; newer local edits must still be sent afterwards.
  if (
    draft?.pending &&
    server.version === draft.version + 1 &&
    equal(draft.pending, server.data)
  )
    return {
      data: draft.data,
      version: server.version,
      saved: server.data,
      conflict: false,
    };
  return {
    data: draft.data,
    version: draft.version,
    saved:
      draft.base ?? (draft.version === server.version ? server.data : null),
    conflict: draft.version !== server.version,
    pending: draft.pending,
  };
}
export function mergeGuestComparison(
  account: Workspace,
  guest: Workspace,
): Workspace {
  // Never silently replace a saved contract, bill or price history during authentication.
  const tariffs = [...account.tariffs];
  const ids = new Map<string, string>();
  for (const tariff of guest.tariffs) {
    const existing = tariffs.find((t) => t.id === tariff.id);
    const id =
      existing && JSON.stringify(existing) !== JSON.stringify(tariff)
        ? crypto.randomUUID()
        : tariff.id;
    ids.set(tariff.id, id);
    if (!existing || id !== tariff.id) tariffs.push({ ...tariff, id });
  }
  return {
    ...account,
    profile: guest.profile,
    tariffs,
    currentId:
      account.currentId ?? (guest.currentId ? ids.get(guest.currentId)! : null),
    currentSince: account.currentId ? account.currentSince : guest.currentSince,
  };
}
