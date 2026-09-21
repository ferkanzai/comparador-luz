import { loadPvpcMonth } from "@/lib/pvpc-loader";
import { previousMonth } from "@/lib/pvpc";
import { connection } from "next/server";

export const maxDuration = 30;

export async function GET() {
  await connection();
  const month = previousMonth();
  try {
    const data = await loadPvpcMonth(month);
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch {
    return Response.json(
      {
        error: `No hemos podido obtener una referencia PVPC completa y revisada para ${month}. Inténtalo de nuevo más tarde.`,
        month,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
