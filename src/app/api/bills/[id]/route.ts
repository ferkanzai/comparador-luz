import * as z from "zod";
import { mutation } from "@/lib/account-api";
import { billSchema, tariffSchema } from "@/lib/domain";
import { removeBill, saveBill } from "@/lib/workspace-actions";
export const runtime = "nodejs";

/**
 * Creates or replaces a bill. `newOffer` also saves an offer made from the
 * bill's prices, in the same transaction.
 */
export const PUT = mutation(
  z.object({ bill: billSchema, newOffer: tariffSchema.optional() }),
  (w, { bill, newOffer }, { id }: { id: string }) => {
    if (bill.id !== id)
      throw new Error("La factura no coincide con la dirección.");
    return saveBill(w, bill, newOffer);
  },
);

export const DELETE = mutation(null, (w, _, { id }: { id: string }) =>
  removeBill(w, id),
);
