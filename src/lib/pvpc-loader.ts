import { previousMonth, pvpcDates, summarizePvpc } from "./pvpc";

export async function loadPvpcMonth(
  month = previousMonth(),
  fetcher: typeof fetch = fetch,
) {
  const dates = pvpcDates(month);
  const payloads: unknown[] = [];
  const signal = AbortSignal.timeout(25_000);
  // Four concurrent requests, at most 31 fixed upstream URLs; no user-supplied host.
  for (let i = 0; i < dates.length; i += 4) {
    payloads.push(
      ...(await Promise.all(
        dates.slice(i, i + 4).map(async (date) => {
          const response = await fetcher(
            `https://api.esios.ree.es/archives/70/download_json?locale=es&date=${date}`,
            {
              signal,
              next: { revalidate: 86400 },
            },
          );
          if (!response.ok)
            throw new Error(
              "No se han podido consultar los precios oficiales de ESIOS.",
            );
          return response.json();
        }),
      )),
    );
  }
  return summarizePvpc(month, payloads);
}
