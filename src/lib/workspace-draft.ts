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
const draftSchema = z.object({ data: draftWorkspaceSchema });
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
// Accounts kept drafts under their user id before per-record saves (ADR-0003).
const key = (owner: string) => `luz:comparison-draft:v1:${owner}`;

/** A guest's workspace, kept only in this browser. */
export function readGuestDraft(storage: DraftStorage): Workspace | null {
  try {
    const result = draftSchema.safeParse(
      JSON.parse(storage.getItem(key("guest")) ?? "null"),
    );
    return result.success ? result.data.data : null;
  } catch {
    return null;
  }
}
/** False when the browser refuses to store it. */
export function writeGuestDraft(storage: DraftStorage, data: Workspace) {
  try {
    storage.setItem(key("guest"), JSON.stringify({ data }));
    return true;
  } catch {
    return false;
  }
}
export function removeDraft(storage: DraftStorage, owner = "guest") {
  try {
    storage.removeItem(key(owner));
  } catch {
    /* Storage unavailable: nothing was kept there either. */
  }
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
