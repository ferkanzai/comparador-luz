import { money, wholeMoney } from "@/lib/domain";
import { annualize, type SavingsSummary } from "@/lib/savings-summary";
import { cn } from "@/lib/utils";

const percent = (share: number) =>
  share.toLocaleString("es-ES", { style: "percent", maximumFractionDigits: 0 });

const chip =
  "rounded-full border border-inverse-muted/40 px-2 py-0.5 text-3xs font-semibold tracking-[0.6px] text-inverse-muted uppercase";
const ledgerItem =
  "flex min-w-0 flex-col gap-1 border-l border-inverse-muted/25 pl-4 first:border-l-0 first:pl-0";
const ledgerLabel =
  "text-3xs font-semibold tracking-[0.8px] text-inverse-muted uppercase";
const ledgerValue = "text-sm font-semibold whitespace-nowrap tabular-nums";

/**
 * The comparison's answer above the table: the saving from switching to the
 * cheapest tariff, per period and per year, beside every tariff's cost.
 */
export default function SavingsSummaryPanel({
  summary,
  simulated,
}: {
  summary: SavingsSummary;
  simulated: boolean;
}) {
  const { kind, reference, best, runnerUp, difference, share, days } = summary;
  const yearly = (amount: number) => wholeMoney(annualize(amount, days));
  return (
    <section
      aria-labelledby="savings-summary-heading"
      className="relative mb-6 overflow-hidden rounded-xl bg-inverse text-inverse-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-lime/10 blur-2xl"
      />
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <div className="relative flex flex-col p-6 max-[600px]:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3
              id="savings-summary-heading"
              className="m-0 mr-1 text-3xs font-semibold tracking-[1.4px] text-lime uppercase"
            >
              {kind === "switch"
                ? `Cambiando a ${best.tariff.name}`
                : kind === "current-cheapest"
                  ? "Tu tarifa actual"
                  : "La más barata"}
            </h3>
            {simulated && <span className={chip}>Consumo simulado</span>}
            {summary.estimated && <span className={chip}>Aproximado</span>}
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <p className="m-0">
              <strong className="block font-heading text-[3.5rem] leading-none font-extrabold tracking-[-2px] text-lime tabular-nums max-[600px]:text-5xl">
                {kind === "switch"
                  ? money(difference)
                  : kind === "current-cheapest"
                    ? "La más barata"
                    : money(best.cost.total)}
              </strong>
              <span className="mt-2 block text-sm text-inverse-muted">
                {kind === "switch"
                  ? `menos en ${days} días`
                  : kind === "current-cheapest"
                    ? `de las ${summary.ranking.length} que comparas`
                    : `${best.tariff.name}, en ${days} días`}
              </span>
            </p>
            <p className="m-0 border-l border-inverse-muted/30 pl-8 max-[600px]:border-l-0 max-[600px]:pl-0">
              <strong className="block font-heading text-3xl font-bold tracking-[-1px] tabular-nums">
                {kind === "switch"
                  ? `≈ ${yearly(difference)}`
                  : kind === "current-cheapest"
                    ? `+${yearly(difference)}`
                    : `≈ ${yearly(best.cost.total)}`}
              </strong>
              <span className="mt-1 block text-xs-plus text-inverse-muted">
                {kind === "switch"
                  ? "menos al año"
                  : kind === "current-cheapest"
                    ? `al año costaría ${runnerUp.tariff.name}`
                    : "al año"}
              </span>
            </p>
          </div>
          <dl className="m-0 mt-6 grid grid-cols-3 gap-4 border-t border-inverse-muted/20 pt-4 max-[600px]:grid-cols-2 max-[600px]:[&>*:nth-child(3)]:col-span-2 max-[600px]:[&>*:nth-child(3)]:border-l-0 max-[600px]:[&>*:nth-child(3)]:pl-0">
            <div className={ledgerItem}>
              <dt className={ledgerLabel}>En {days} días</dt>
              <dd className={cn(ledgerValue, "m-0")}>
                {kind === "switch"
                  ? `${money(reference.cost.total)} → ${money(best.cost.total)}`
                  : money(reference.cost.total)}
              </dd>
            </div>
            <div className={ledgerItem}>
              <dt className={ledgerLabel}>
                {kind === "switch" ? "Diferencia" : "Siguiente"}
              </dt>
              <dd
                className={cn(
                  ledgerValue,
                  "m-0",
                  kind === "switch" && "text-lime",
                )}
              >
                {kind === "switch" ? "−" : "+"}
                {money(difference)} · {kind === "switch" ? "−" : "+"}
                {percent(share)}
              </dd>
            </div>
            <div className={ledgerItem}>
              <dt className={ledgerLabel}>Al año</dt>
              <dd className={cn(ledgerValue, "m-0")}>
                ≈ {yearly(reference.cost.total)}
                {kind === "switch" && ` → ${yearly(best.cost.total)}`}
              </dd>
            </div>
          </dl>
          <p className="mt-auto mb-0 pt-4 text-3xs text-inverse-muted">
            {kind === "no-current" &&
              "Marca tu tarifa actual para ver cuánto ahorrarías al cambiar. "}
            Año estimado a partir de tus {days} días × 365, con el mismo consumo
            y los mismos precios. No es una previsión.
          </p>
        </div>
        <Ranking summary={summary} />
      </div>
    </section>
  );
}

/** Every priced tariff; scrolls within the answer's height so the panel never grows. */
function Ranking({ summary }: { summary: SavingsSummary }) {
  const { ranking, reference, best, kind, days } = summary;
  const max = Math.max(...ranking.map((row) => row.cost.total));
  return (
    <div className="relative border-l border-inverse-muted/20 bg-inverse-foreground/[0.04] max-[900px]:h-[248px] max-[900px]:border-t max-[900px]:border-l-0">
      <div
        // Focusable, so the list can be scrolled from the keyboard.
        tabIndex={0}
        role="region"
        aria-label="Coste de cada tarifa"
        className="absolute inset-0 overflow-y-auto overscroll-contain px-6 pt-5 pb-8 [scrollbar-color:var(--inverse-muted)_transparent] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime max-[600px]:px-5"
        style={{
          maskImage:
            "linear-gradient(to bottom, black calc(100% - 2.5rem), transparent)",
        }}
      >
        <div className="mb-3 flex justify-between text-3xs font-semibold tracking-[0.8px] text-inverse-muted uppercase">
          <span>{ranking.length} comparables</span>
          <span>{days} días · al año</span>
        </div>
        <ol className="m-0 grid list-none gap-3 p-0">
          {ranking.map((row) => {
            const isReference = row.tariff.id === reference.tariff.id;
            const isBest = row.tariff.id === best.tariff.id;
            const isCurrent = kind !== "no-current" && isReference;
            return (
              <li key={row.tariff.id} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs-plus">
                  <span
                    className={cn(
                      "truncate",
                      (isBest || isCurrent) && "font-semibold",
                    )}
                  >
                    {row.tariff.name}
                    {isCurrent && (
                      <span className="font-normal text-inverse-muted">
                        {" "}
                        · actual
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
                    <span className="font-semibold">
                      {money(row.cost.total)}
                    </span>
                    <span
                      className={cn(
                        "w-16 text-right text-2xs",
                        row.yearly < 0 ? "text-lime" : "text-inverse-muted",
                      )}
                    >
                      {isReference ? (
                        <span aria-label="Referencia">—</span>
                      ) : (
                        `${row.yearly < 0 ? "−" : "+"}${wholeMoney(Math.abs(row.yearly))}`
                      )}
                    </span>
                  </span>
                </div>
                <div
                  aria-hidden
                  className="h-2 rounded-full bg-inverse-foreground/10"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isBest
                        ? "bg-lime"
                        : isCurrent
                          ? "bg-inverse-foreground/80"
                          : "bg-inverse-muted/45",
                    )}
                    style={{ width: `${(row.cost.total / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
