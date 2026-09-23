import { mutation } from "@/lib/account-api";
import { profileSchema } from "@/lib/domain";
import { updateProfile } from "@/lib/workspace-actions";
export const runtime = "nodejs";

/** Only the fields sent change, so two devices editing different fields don't overwrite each other. */
export const PATCH = mutation(profileSchema.partial(), (w, fields) =>
  updateProfile(w, { ...w.profile, ...fields }),
);
