import { ArrowUpRight, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { money, shortDate, today, type Tariff } from "@/lib/domain";
import { type Calculation, cents } from "@/lib/calculator";
import { estimatedCharges } from "@/lib/charge-estimates";
import { estimateLines } from "@/lib/bill-data";
import { tariffLimitMessage } from "@/lib/tariff-periods";
import CostCategoryLabel, { billLineCategories } from "./cost-category-label";
import EstimateNotice from "./estimate-notice";
import { Modal } from "./ui";
import { CostDifference, EnergyRates, PowerRates } from "./tariff-rates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ComparisonRow = {
  tariff: Tariff;
  cost: Calculation | null;
  reason: string;
};
export type TariffActions = {
  onEdit: (tariff: Tariff) => void;
  onDuplicate: (tariff: Tariff) => void;
  onCurrent: (tariff: Tariff) => void;
  onHistorical?: (tariff: Tariff) => void;
  onRemove: (tariff: Tariff) => void;
};

export const provider = "mb-1 block text-2xs font-normal text-muted-foreground";
export const amount =
  "block font-heading text-2xl font-[750] tracking-[-0.8px] whitespace-nowrap tabular-nums max-[600px]:text-xl";
export const exclusion = "mt-1.5 block max-w-[180px] text-2xs text-caution";
const componentCost = "mb-2.5 block text-sm-plus font-[650] tabular-nums";
const cardLine = "flex justify-between gap-3";
const cardAmount = "m-0 font-[650] tabular-nums";
const cell = "border-b border-border-soft px-5 py-3 text-left align-top";
const stickyColumn =
  "sticky left-0 w-[205px] max-w-[240px] min-w-[205px] border-r border-r-border";
const headCell = cn(
  cell,
  "sticky top-0 z-2 bg-muted py-3.5 text-xs font-semibold tracking-[0.8px] text-muted-foreground uppercase",
);
const headNote = "mt-1 block text-3xs font-normal text-muted-foreground";

const detailHeading =
  "mt-6 mb-3 font-heading text-base font-bold tracking-[-0.25px]";
const breakdownLine =
  "my-1.5 flex justify-between gap-2.5 text-sm text-foreground";
const breakdownAmount = "m-0 tabular-nums";
export const textLink =
  "inline-flex min-h-11 items-center gap-2 text-sm-plus font-semibold text-inherit no-underline underline-offset-4 hover:text-primary hover:underline";
const detailActionRow = "grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-2";

type RowProps = {
  row: ComparisonRow;
  current: boolean;
  cheapest: boolean;
  baseline?: number;
  unit: Tariff["powerUnit"];
  selected: boolean;
  selectable: boolean;
  onToggle: (id: string) => void;
  onDetails: (id: string) => void;
  onEdit: (tariff: Tariff) => void;
  onRemove: (tariff: Tariff) => void;
};

function otherCharges(cost: Calculation) {
  return cents(
    cost.social +
      cost.snoee +
      cost.meter +
      cost.services +
      cost.electricityTax +
      cost.vat +
      cost.servicesVat,
  );
}

function TariffIdentity({
  row: { tariff },
  current,
  cheapest,
  selected,
  selectable,
  onToggle,
  onDetails,
}: RowProps) {
  return (
    <>
      <Checkbox
        className="float-left mt-0.5 mr-2.5 max-[600px]:mr-2"
        aria-label={`Comparar ${tariff.name}`}
        checked={selected}
        disabled={!selectable}
        onCheckedChange={() => onToggle(tariff.id)}
      />
      <span className={provider}>
        {tariff.provider || "Sin comercializadora"}
      </span>
      <button
        className="block cursor-pointer border-0 bg-transparent p-0 text-left font-heading text-sm-plus leading-[1.35] font-bold tracking-normal wrap-anywhere text-inherit normal-case underline-offset-3 hover:underline max-[600px]:text-xs-plus"
        onClick={() => onDetails(tariff.id)}
      >
        {tariff.name}
      </button>
      <div className="clear-both mt-2.5 flex flex-wrap gap-1.5">
        {current && <Badge variant="outline">Tu tarifa actual</Badge>}
        {cheapest && (
          <Badge className="bg-lime text-foreground">Menor coste</Badge>
        )}
        {estimatedCharges(tariff) && (
          <Badge
            variant="outline"
            className="border-warning-border bg-warning-muted text-warning"
          >
            Cargos estimados
          </Badge>
        )}
      </div>
      {tariff.validUntil && (
        <span className={provider}>
          {!current && tariff.validUntil < today()
            ? "Caducada"
            : "Oferta válida hasta"}{" "}
          · {shortDate(tariff.validUntil)}
        </span>
      )}
    </>
  );
}

function TariffTotal({ row: { cost, reason }, baseline, current }: RowProps) {
  return cost ? (
    <>
      <strong className={amount}>{money(cost.total)}</strong>
      <CostDifference
        total={cost.total}
        baseline={baseline}
        current={current}
      />
    </>
  ) : (
    <>
      <strong className={amount}>—</strong>
      <span className={exclusion}>{reason}</span>
    </>
  );
}

function DetailsLink({
  row: { tariff },
  onDetails,
  className,
}: RowProps & { className?: string }) {
  return (
    <button
      className={cn(
        "flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-sans text-3xs tracking-normal text-muted-foreground normal-case underline underline-offset-3",
        className,
      )}
      onClick={() => onDetails(tariff.id)}
      aria-label={`Ver desglose de ${tariff.name}`}
    >
      Ver desglose <ArrowUpRight size={13} className="shrink-0" />
    </button>
  );
}

function RowActions({
  row: { tariff },
  current,
  onEdit,
  onRemove,
  className,
}: RowProps & { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(tariff)}
        aria-label={`Editar ${tariff.name}`}
        title="Editar tarifa"
      >
        <Pencil size={16} />
      </Button>
      {!current && (
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemove(tariff)}
          aria-label={`Eliminar ${tariff.name}`}
          title="Eliminar tarifa"
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );
}

function TableRow(props: RowProps) {
  const { tariff, cost } = props.row;
  const body = cn(
    cell,
    "group-last/row:border-b-0 group-hover/row:bg-inverse-foreground",
    props.current && "bg-background",
  );
  return (
    <tr className="group/row">
      <th
        scope="row"
        className={cn(
          body,
          stickyColumn,
          "z-1 text-sm font-medium tracking-[0.8px] text-muted-foreground uppercase",
          !props.current && "bg-card",
        )}
      >
        <TariffIdentity {...props} />
      </th>
      <td className={cn(body, "min-w-[192px]")}>
        <TariffTotal {...props} />
      </td>
      <td className={cn(body, "min-w-[212px]")}>
        <span className={componentCost}>{cost ? money(cost.energy) : "—"}</span>
        <EnergyRates tariff={tariff} />
      </td>
      <td className={cn(body, "max-w-[265px] min-w-[238px]")}>
        <span className={componentCost}>{cost ? money(cost.power) : "—"}</span>
        <PowerRates tariff={tariff} unit={props.unit} />
      </td>
      <td className={cn(body, "min-w-[135px]")}>
        <span className={componentCost}>
          {cost ? money(otherCharges(cost)) : "—"}
        </span>
        <DetailsLink {...props} />
      </td>
      <td className={cn(body, "pr-2.5 pl-1")}>
        <RowActions {...props} />
      </td>
    </tr>
  );
}

function TariffCard(props: RowProps) {
  const { tariff, cost } = props.row;
  return (
    <li>
      <article
        className={cn(
          "flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4",
          props.current && "bg-background",
        )}
        aria-label={tariff.name}
      >
        <div className="flex justify-between gap-3">
          <div>
            <TariffIdentity {...props} />
          </div>
          <RowActions {...props} className="flex-row items-start" />
        </div>
        <div>
          <TariffTotal {...props} />
        </div>
        {cost && (
          <dl className="m-0 grid gap-1.5 border-t border-border-soft pt-3 text-xs-plus">
            <div className={cardLine}>
              <dt>
                <CostCategoryLabel category="energy">Energía</CostCategoryLabel>
              </dt>
              <dd className={cardAmount}>{money(cost.energy)}</dd>
            </div>
            <div className={cardLine}>
              <dt>
                <CostCategoryLabel category="power">Potencia</CostCategoryLabel>
              </dt>
              <dd className={cardAmount}>{money(cost.power)}</dd>
            </div>
            <div className={cardLine}>
              <dt>
                <CostCategoryLabel category="other">
                  Otros cargos e impuestos
                </CostCategoryLabel>
              </dt>
              <dd className={cardAmount}>{money(otherCharges(cost))}</dd>
            </div>
          </dl>
        )}
        <DetailsLink {...props} className="mt-auto" />
      </article>
    </li>
  );
}

export default function ComparisonTable({
  rows,
  currentId,
  unit,
  onDetails,
  onEdit,
  onRemove,
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
  rows: ComparisonRow[];
  currentId: string | null;
  unit: Tariff["powerUnit"];
  onDetails: (id: string) => void;
  onEdit: (tariff: Tariff) => void;
  onRemove: (tariff: Tariff) => void;
}) {
  const baseline = rows.find((row) => row.tariff.id === currentId)?.cost?.total;
  const best = rows.find((row) => row.cost)?.cost?.total;
  const rowProps = (row: ComparisonRow): RowProps => {
    const selected = selectedIds.includes(row.tariff.id);
    return {
      row,
      current: row.tariff.id === currentId,
      cheapest: row.cost !== null && row.cost.total === best,
      baseline,
      unit,
      selected,
      selectable: selected || selectedIds.length < 3,
      onToggle,
      onDetails,
      onEdit,
      onRemove,
    };
  };
  return (
    <>
      <div className="overflow-clip rounded-lg border border-border bg-card max-[1199px]:hidden">
        <table
          className="w-full border-separate border-spacing-0 text-left text-base leading-[1.4]"
          aria-label="Comparativa de tarifas"
        >
          <thead>
            <tr>
              <th scope="col" className={cn(headCell, stickyColumn, "z-3")}>
                Tarifa
              </th>
              <th scope="col" className={headCell}>
                Total del período{" "}
                <small className={headNote}>
                  y diferencia con tu tarifa actual
                </small>
              </th>
              <th scope="col" className={headCell}>
                <CostCategoryLabel category="energy">Energía</CostCategoryLabel>
                <small className={headNote}>
                  coste y precios sin impuestos
                </small>
              </th>
              <th scope="col" className={headCell}>
                <CostCategoryLabel category="power">Potencia</CostCategoryLabel>
                <small className={headNote}>
                  coste y precios sin impuestos
                </small>
              </th>
              <th scope="col" className={headCell}>
                <CostCategoryLabel category="other">
                  Otros cargos
                </CostCategoryLabel>
                <small className={headNote}>
                  <CostCategoryLabel category="taxes">
                    e impuestos elegidos
                  </CostCategoryLabel>
                </small>
              </th>
              <th scope="col" className={headCell}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TableRow key={row.tariff.id} {...rowProps(row)} />
            ))}
          </tbody>
        </table>
      </div>
      <ol
        className="m-0 hidden list-none grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 p-0 max-[1199px]:grid"
        aria-label="Comparativa de tarifas"
      >
        {rows.map((row) => (
          <TariffCard key={row.tariff.id} {...rowProps(row)} />
        ))}
      </ol>
    </>
  );
}

export function TariffDetails({
  row: { tariff, cost, reason },
  current,
  unit,
  actions,
  canDuplicate,
  onClose,
}: {
  row: ComparisonRow;
  current: boolean;
  unit: Tariff["powerUnit"];
  actions: TariffActions;
  canDuplicate: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={tariff.name} onClose={onClose}>
      <div className="p-6 max-[520px]:p-5">
        <p className="m-0 mb-5 text-sm-plus text-muted-foreground">
          {tariff.provider || "Comercializadora sin indicar"} ·{" "}
          {current ? "Tu tarifa actual" : "Oferta para comparar"}
        </p>
        {reason && <Alert role="note">{reason}</Alert>}
        <h3 className={detailHeading}>Precios sin impuestos</h3>
        <EnergyRates tariff={tariff} className="mb-3.5 max-w-[280px] text-sm" />
        <PowerRates tariff={tariff} unit={unit} size="detail" />
        <p className="m-0 mb-5 text-sm-plus text-muted-foreground">
          Referencia de potencia: 1 kW en cada período. El coste usa tus kW
          contratados.
        </p>
        {cost && (
          <>
            <h3 className={detailHeading}>Desglose del período</h3>
            <dl className="m-0 mt-4 border-t border-dashed border-chart-5 py-2.5">
              {estimateLines([cost]).map(([key, label]) => (
                <div key={key} className={breakdownLine}>
                  <dt>
                    <CostCategoryLabel category={billLineCategories[key]}>
                      {label}
                    </CostCategoryLabel>
                  </dt>
                  <dd className={breakdownAmount}>{money(cost[key])}</dd>
                </div>
              ))}
              <div
                className={cn(
                  breakdownLine,
                  "border-t border-muted-foreground pt-2 font-semibold text-primary",
                )}
              >
                <dt>Total del período</dt>
                <dd className={breakdownAmount}>{money(cost.total)}</dd>
              </div>
            </dl>
          </>
        )}
        <EstimateNotice tariff={tariff} />
        <details className="mt-5 border-t border-border pt-5">
          <summary className="min-h-11 cursor-pointer content-center text-sm-plus font-semibold">
            Validez y condiciones
          </summary>
          <p className="my-3.5 text-sm-plus">
            Oferta válida hasta:{" "}
            {tariff.validUntil
              ? shortDate(tariff.validUntil)
              : "Sin fecha indicada"}
          </p>
          <p className="my-3.5 text-sm-plus text-muted-foreground">
            Es la fecha límite para contratar la oferta, no la fecha de fin de
            tu contrato.
          </p>
          {tariff.notes && (
            <p className="my-3.5 wrap-anywhere whitespace-pre-wrap">
              {tariff.notes}
            </p>
          )}
          {tariff.url && (
            <a
              href={tariff.url}
              className={textLink}
              target="_blank"
              rel="noreferrer"
            >
              Ver oferta original <ExternalLink size={15} />
            </a>
          )}
        </details>
        <div className="mt-7 grid gap-2.5 border-t border-border pt-6">
          {!current && (
            <div className={detailActionRow}>
              <Button
                onClick={() => {
                  onClose();
                  actions.onCurrent(tariff);
                }}
              >
                Registrar como actual
              </Button>
              {actions.onHistorical && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    actions.onHistorical?.(tariff);
                  }}
                >
                  Registrar como anterior
                </Button>
              )}
            </div>
          )}
          <div className={detailActionRow}>
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                actions.onEdit(tariff);
              }}
            >
              <Pencil size={16} />
              {current ? "Corregir datos" : "Editar tarifa"}
            </Button>
            <Button
              variant="outline"
              disabled={!canDuplicate}
              aria-describedby={
                canDuplicate ? undefined : "tariff-detail-limit"
              }
              onClick={() => {
                onClose();
                actions.onDuplicate(tariff);
              }}
            >
              <Copy size={16} />
              Duplicar
            </Button>
            {!current && (
              <Button
                variant="destructive"
                onClick={() => {
                  actions.onRemove(tariff);
                  onClose();
                }}
              >
                <Trash2 size={16} />
                Eliminar tarifa
              </Button>
            )}
          </div>
          {!canDuplicate && (
            <p
              id="tariff-detail-limit"
              className="m-0 text-sm-plus text-muted-foreground"
            >
              {tariffLimitMessage}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
