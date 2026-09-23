import * as z from "zod";
import { mutation } from "@/lib/account-api";
import { tariffSchema } from "@/lib/domain";
import {
  correctPeriod,
  removePeriod,
  tariffPeriods,
} from "@/lib/tariff-periods";
export const runtime = "nodejs";

/** Corrects a recorded period, the current one included. */
export const PUT = mutation(
  z.object({
    tariff: tariffSchema,
    start: z.string(),
    end: z.string(),
    moveBoundary: z.boolean().optional(),
  }),
  (w, { tariff, ...dates }, { id }: { id: string }) =>
    correctPeriod(w, id, tariff, dates),
);

// Removing a period that is already gone succeeds, as for offers and bills.
export const DELETE = mutation(null, (w, _, { id }: { id: string }) =>
  tariffPeriods(w).some((period) => period.id === id)
    ? removePeriod(w, id)
    : w,
);
