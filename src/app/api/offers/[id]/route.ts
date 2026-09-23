import { mutation } from "@/lib/account-api";
import { tariffSchema } from "@/lib/domain";
import { removeTariff, saveTariff } from "@/lib/workspace-actions";
export const runtime = "nodejs";

const sameId = (id: string, tariff: { id: string }) => {
  if (tariff.id !== id)
    throw new Error("La tarifa no coincide con la dirección.");
};

/** Creates or replaces an offer. The current tariff is changed through /api/contract. */
export const PUT = mutation(
  tariffSchema,
  (w, tariff, { id }: { id: string }) => {
    sameId(id, tariff);
    return saveTariff(w, tariff, {
      since: "",
      profile: w.profile,
      makeCurrent: false,
    });
  },
);

export const DELETE = mutation(null, (w, _, { id }: { id: string }) => {
  if (id === w.currentId)
    throw new Error("Tu tarifa actual se elimina desde Mis tarifas.");
  return removeTariff(w, id);
});
