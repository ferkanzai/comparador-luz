import * as z from "zod";
import { mutation } from "@/lib/account-api";
import { tariffSchema } from "@/lib/domain";
import { recordCurrent } from "@/lib/tariff-periods";
export const runtime = "nodejs";

/** Registers the current tariff, or a real price change that closes the previous period. */
export const POST = mutation(
  z.object({ tariff: tariffSchema, since: z.iso.date() }),
  (w, { tariff, since }) => recordCurrent(w, tariff, since),
);
