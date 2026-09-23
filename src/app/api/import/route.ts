import { mutation } from "@/lib/account-api";
import { workspaceSchema } from "@/lib/domain";
import { mergeGuestComparison } from "@/lib/workspace-draft";
import * as z from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Moves a guest's workspace into the account on sign-in (no button in the UI). */
export const POST = mutation(z.object({ data: workspaceSchema }), (w, body) =>
  mergeGuestComparison(w, body.data),
);
