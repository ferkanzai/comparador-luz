"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Plus,
  History,
  Pencil,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  ChevronDown,
  TriangleAlert,
} from "lucide-react";
import {
  decimalComma,
  newTariff,
  shortDate,
  powerDescription,
  type Workspace,
} from "@/lib/domain";
import { tariffPeriods, periodProblem } from "@/lib/tariff-periods";
import { Empty, Modal } from "./ui";
import ConfirmDialog from "./confirm-dialog";
import EstimateNotice from "./estimate-notice";
import CostCategoryLabel from "./cost-category-label";
import { estimatedCharges } from "@/lib/charge-estimates";
import { formatTariffPrice } from "@/lib/tariff-price-format";
import { EnergyRates } from "./tariff-rates";
import TariffPriceComparison from "./tariff-price-comparison";

import type { TariffRecordDraft } from "./tariff-record-form";
import { commands, type WorkspaceCommand } from "@/lib/workspace-commands";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/* Record actions: 40px targets, 44px on a phone. */
const recordAction =
  "h-auto min-h-10 gap-2 text-xs-plus whitespace-normal max-[700px]:min-h-11 max-[700px]:text-xs";
/* The unit prices of a record, large, three to a row. */
const recordRates =
  "grid max-w-[500px] grid-cols-3 gap-5 min-[901px]:max-w-[420px] max-[700px]:gap-3 *:block [&_dd]:text-xl/[1.6] [&_dd]:font-[550] [&_dd]:tracking-[-0.5px] [&_dd_span]:text-2xs [&_dd_span]:font-normal [&_dd_span]:tracking-normal max-[700px]:[&_dd_span]:-mt-0.5 max-[700px]:[&_dd_span]:block [&_dt]:text-xs-plus";
/* The same prices unrounded, one per line. */
const originalRates =
  "mt-1.5 max-w-[500px] gap-1 min-[901px]:max-w-[420px] max-[700px]:gap-3 *:grid *:grid-cols-[60px_minmax(0,1fr)] *:gap-2 [&_dd]:text-xs-plus [&_dd]:whitespace-normal [&_dd]:wrap-anywhere [&_dd_span]:text-2xs [&_dt]:text-xs-plus";
const TariffRecordForm = dynamic(() => import("./tariff-record-form"));

export default function TariffHistory({
  workspace,
  run,
  onCompare,
}: {
  workspace: Workspace;
  run: (command: WorkspaceCommand) => void;
  onCompare: () => void;
}) {
  const [draft, setDraft] = useState<TariffRecordDraft | null>(null);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const periods = tariffPeriods(workspace);
  const removing = periods.find((p) => p.id === removingId);
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 max-[700px]:mb-4 max-[700px]:block">
        <div>
          <h2 className="m-0 font-heading text-3xl/[1.6] font-bold tracking-[-1px] max-[700px]:text-2xl/[1.6]">
            Mis tarifas
          </h2>
          <p className="m-0 mt-1 text-sm-plus text-muted-foreground">
            Tus contratos y sus precios, en orden.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 max-[700px]:mt-3 max-[700px]:gap-x-4 max-[700px]:gap-y-1.5">
          <Button onClick={() => setChoosing(true)}>
            {workspace.currentId
              ? "Cambiar tarifa actual"
              : "Registrar tarifa actual"}
          </Button>
          <Button
            variant="link"
            size="inline"
            className="min-h-11 gap-1.5 border-0 text-sm font-semibold text-foreground"
            onClick={() =>
              setDraft({
                tariff: newTariff(),
                kind: "historical",
                title: "Añadir tarifa anterior",
              })
            }
          >
            <Plus />
            Añadir tarifa anterior
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      )}
      {periods.length > 0 && <TariffPriceComparison periods={periods} />}
      <div className="grid gap-3 min-[901px]:grid-cols-2 min-[901px]:items-stretch min-[901px]:gap-5">
        {periods.map((period) => {
          const problem = periodProblem(period, periods);
          const hasEstimates = Boolean(estimatedCharges(period.tariff));
          const energyValues =
            period.tariff.kind === "fixed"
              ? [period.tariff.energyPeak]
              : [
                  period.tariff.energyPeak,
                  period.tariff.energyFlat,
                  period.tariff.energyValley,
                ];
          const roundedEnergy = energyValues.some(
            (v) => formatTariffPrice(v) !== decimalComma(v),
          );
          return (
            <article
              key={period.id}
              className="grid grid-cols-[minmax(210px,1fr)_minmax(0,1.7fr)] gap-x-8 gap-y-2 bg-card p-5 *:min-w-0 min-[901px]:flex min-[901px]:flex-col min-[901px]:gap-3.5 min-[901px]:px-6 max-[700px]:grid-cols-1 max-[700px]:gap-4 max-[700px]:p-4"
            >
              <div>
                <div className="mb-1.5 flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] text-muted-foreground uppercase",
                      period.current &&
                        "text-primary before:size-1.5 before:rounded-full before:bg-current",
                    )}
                  >
                    {period.current ? "Tu tarifa actual" : "Tarifa anterior"}
                  </span>
                  {problem && (
                    <details
                      className="relative ml-auto"
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.currentTarget.open = false;
                          event.currentTarget.querySelector("summary")?.focus();
                        }
                      }}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget))
                          event.currentTarget.open = false;
                      }}
                    >
                      <summary
                        aria-label={`Revisar fechas de ${period.tariff.name}`}
                        className="flex min-h-6 cursor-pointer list-none items-center gap-1.5 text-2xs text-caution [&::-webkit-details-marker]:hidden"
                      >
                        <TriangleAlert size={13} /> Revisar fechas
                      </summary>
                      <div className="absolute top-[calc(100%+6px)] right-0 z-5 flex w-[min(270px,calc(100vw-68px))] flex-col gap-1.5 rounded-sm border border-warning-border bg-warning-muted px-3.5 py-3 text-xs-plus text-warning shadow-md">
                        <p className="m-0">{problem}</p>
                        <p className="m-0">
                          Usa «Corregir datos» para ajustar este período.
                        </p>
                      </div>
                    </details>
                  )}
                </div>
                <h3 className="m-0 font-heading text-xl leading-[1.35] font-bold tracking-[-0.25px] wrap-anywhere">
                  {period.tariff.name}
                </h3>
                <p className="m-0 text-sm/[1.6] text-muted-foreground">
                  {period.tariff.provider}
                </p>
                <p className="m-0 mt-2 text-xs-plus text-muted-foreground tabular-nums *:whitespace-nowrap max-[700px]:mt-1">
                  <span>{shortDate(period.start)}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> hasta </span>
                  <span>{period.current ? "Hoy" : shortDate(period.end)}</span>
                </p>
              </div>
              <div>
                <p className="m-0 mb-1.5 text-2xs font-semibold tracking-[0.06em] uppercase">
                  <CostCategoryLabel category="energy">
                    Energía
                  </CostCategoryLabel>{" "}
                  <span className="font-normal tracking-normal text-muted-foreground normal-case">
                    · sin impuestos
                  </span>
                </p>
                <EnergyRates
                  tariff={period.tariff}
                  compact
                  className={recordRates}
                />
                <details className="group/prices">
                  <summary className="flex min-h-9 w-fit cursor-pointer list-none flex-wrap items-center gap-1.5 text-xs-plus text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronDown
                      size={14}
                      className="shrink-0 group-open/prices:rotate-180"
                    />{" "}
                    Potencia y otros cargos
                    {hasEstimates && (
                      <span className="border-0 border-b border-dotted border-input text-2xs text-muted-foreground">
                        Incluye estimaciones
                      </span>
                    )}
                  </summary>
                  <dl className="m-0 mb-2 text-xs-plus *:mb-1.5 *:grid *:grid-cols-[100px_minmax(0,1fr)] *:gap-2 [&_dd]:m-0 [&_dd]:tabular-nums [&_dt]:text-muted-foreground">
                    <div>
                      <dt>
                        <CostCategoryLabel category="power">
                          Potencia
                        </CostCategoryLabel>
                      </dt>
                      <dd>{powerDescription(period.tariff)}</dd>
                    </div>
                    <div>
                      <dt>
                        <CostCategoryLabel category="other">
                          Alquiler
                        </CostCategoryLabel>
                      </dt>
                      <dd>{formatTariffPrice(period.tariff.meterDay)} €/día</dd>
                    </div>
                    <div>
                      <dt>
                        <CostCategoryLabel category="other">
                          Bono social
                        </CostCategoryLabel>
                      </dt>
                      <dd>
                        {formatTariffPrice(period.tariff.socialDay)} €/día
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <CostCategoryLabel category="other">
                          Coste SNOEE
                        </CostCategoryLabel>
                      </dt>
                      <dd>{formatTariffPrice(period.tariff.snoeeKwh)} €/kWh</dd>
                    </div>
                    <div>
                      <dt>
                        <CostCategoryLabel category="other">
                          Servicios
                        </CostCategoryLabel>
                      </dt>
                      <dd>
                        {formatTariffPrice(period.tariff.servicesMonth)} €/mes
                      </dd>
                    </div>
                  </dl>
                  {roundedEnergy && (
                    <div className="my-3 text-xs/[1.6] text-muted-foreground">
                      <p className="m-0">
                        Precios de energía originales · sin redondear
                      </p>
                      <EnergyRates
                        tariff={period.tariff}
                        className={originalRates}
                      />
                    </div>
                  )}
                  {hasEstimates && (
                    <EstimateNotice tariff={period.tariff} className="my-2" />
                  )}
                  {period.tariff.notes && (
                    <p className="m-0 text-sm-plus text-muted-foreground">
                      {period.tariff.notes}
                    </p>
                  )}
                </details>
              </div>
              <div className="col-span-full flex flex-wrap items-center gap-x-5 gap-y-1 min-[901px]:mt-auto min-[901px]:gap-x-3.5 max-[700px]:gap-x-2">
                <Button
                  variant="outline"
                  className={cn(
                    recordAction,
                    "rounded-sm px-3 font-semibold max-[700px]:px-2",
                  )}
                  aria-label={`Corregir datos de ${period.tariff.name}`}
                  onClick={() =>
                    setDraft({
                      tariff: period.tariff,
                      kind: "correction",
                      periodId: period.id,
                      title: "Corregir datos",
                    })
                  }
                >
                  <Pencil className="size-3.5" /> Corregir datos
                </Button>
                {period.current && (
                  <Button
                    variant="link"
                    size="inline"
                    className={cn(recordAction, "border-0 font-semibold")}
                    onClick={() =>
                      setDraft({
                        tariff: period.tariff,
                        kind: "current",
                        title: "Registrar cambio de precios",
                      })
                    }
                  >
                    <RefreshCw className="size-3.5" /> Registrar cambio de
                    precios
                  </Button>
                )}
                <Button
                  variant="link"
                  size="inline"
                  className={cn(
                    recordAction,
                    "border-0 font-normal text-muted-foreground",
                  )}
                  onClick={() => {
                    try {
                      run(commands.comparePeriod(period.id));
                      onCompare();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "No se pudo copiar la tarifa.",
                      );
                    }
                  }}
                >
                  Volver a comparar <ArrowUpRight className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-sm text-muted-foreground hover:bg-destructive-muted hover:text-destructive max-[700px]:size-11"
                  aria-label={`Eliminar registro de ${period.tariff.name}`}
                  title="Eliminar registro"
                  onClick={() => setRemovingId(period.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!periods.length && (
        <div className="rounded-xl border border-border bg-card">
          <Empty icon={<History size={26} />} title="Tu historia empieza aquí.">
            Añade los precios y las fechas de una tarifa que hayas tenido.
          </Empty>
        </div>
      )}
      {removing && (
        <ConfirmDialog
          title="Eliminar registro"
          summary={
            <>
              <p className="text-muted-foreground">
                {removing.current ? "Tarifa actual" : "Tarifa anterior"} · desde{" "}
                {shortDate(removing.start)}{" "}
                {removing.current
                  ? "hasta hoy"
                  : `hasta ${shortDate(removing.end)}`}
              </p>
              <h3>{removing.tariff.name}</h3>
            </>
          }
          consequence={
            <>
              <p>
                {removing.current
                  ? "Te quedarás sin tarifa actual hasta que registres otra. No reactivaremos una tarifa anterior."
                  : "Quedará un hueco en tu historial. No cambiaremos las fechas de otras tarifas."}
              </p>
              <p className="text-muted-foreground">
                Las facturas guardadas no cambian.
              </p>
            </>
          }
          confirmLabel="Eliminar registro"
          onConfirm={() => {
            run(commands.removePeriod(removing.id));
            setRemovingId(null);
          }}
          onClose={() => setRemovingId(null)}
        />
      )}
      {choosing && (
        <Modal
          title="Registrar tarifa actual"
          onClose={() => setChoosing(false)}
        >
          <div className="p-6 max-[520px]:p-5">
            <p className="m-0 mb-5 text-sm-plus">
              Elige una oferta del comparador o introduce los precios de tu
              contrato. Esta acción no cambia tu compañía.
            </p>
            <div className="my-5 flex flex-wrap items-center gap-4">
              {workspace.tariffs
                .filter((t) => t.id !== workspace.currentId)
                .map((tariff) => (
                  <Button
                    variant="outline"
                    key={tariff.id}
                    onClick={() => {
                      setChoosing(false);
                      setDraft({
                        tariff,
                        kind: "current",
                        title: "Registrar tarifa actual",
                      });
                    }}
                  >
                    {tariff.name}
                  </Button>
                ))}
            </div>
            <Button
              onClick={() => {
                setChoosing(false);
                setDraft({
                  tariff: newTariff(),
                  kind: "current",
                  title: "Registrar tarifa actual",
                });
              }}
            >
              Introducir nueva tarifa
            </Button>
          </div>
        </Modal>
      )}
      {draft && (
        <TariffRecordForm
          workspace={workspace}
          draft={draft}
          run={run}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
}
