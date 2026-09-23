import * as z from "zod";
import { mutation } from "@/lib/account-api";
import { tariffSchema } from "@/lib/domain";
import { recordHistorical } from "@/lib/tariff-periods";
export const runtime = "nodejs";

/** Records a past contract period. */
export const POST = mutation(
  z.object({ tariff: tariffSchema, start: z.iso.date(), end: z.iso.date() }),
  (w, { tariff, start, end }) => recordHistorical(w, tariff, start, end),
);
