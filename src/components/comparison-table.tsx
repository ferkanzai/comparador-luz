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
        className="finalist-checkbox"
        aria-label={`Comparar ${tariff.name}`}
        checked={selected}
        disabled={!selectable}
        onCheckedChange={() => onToggle(tariff.id)}
      />
      <span className="comparison-provider">
        {tariff.provider || "Sin comercializadora"}
      </span>
      <button
        className="tariff-name-button"
        onClick={() => onDetails(tariff.id)}
      >
        {tariff.name}
      </button>
      <div className="comparison-tags">
        {current && (
          <Badge variant="outline" className="comparison-tag">
            Tu tarifa actual
          </Badge>
        )}
        {cheapest && (
          <Badge className="comparison-tag bg-lime text-foreground">
            Menor coste
          </Badge>
        )}
        {estimatedCharges(tariff) && (
          <Badge
            variant="outline"
            className="comparison-tag border-warning-border bg-warning-muted text-warning"
          >
            Cargos estimados
          </Badge>
        )}
      </div>
      {tariff.validUntil && (
        <span className="comparison-provider">
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
      <strong className="comparison-amount">{money(cost.total)}</strong>
      <CostDifference
        total={cost.total}
        baseline={baseline}
        current={current}
      />
    </>
  ) : (
    <>
      <strong className="comparison-amount">—</strong>
      <span className="comparison-exclusion">{reason}</span>
    </>
  );
}

function DetailsLink({ row: { tariff }, onDetails }: RowProps) {
  return (
    <button
      className="comparison-detail-link"
      onClick={() => onDetails(tariff.id)}
      aria-label={`Ver desglose de ${tariff.name}`}
    >
      Ver desglose <ArrowUpRight size={13} />
    </button>
  );
}

function RowActions({ row: { tariff }, current, onEdit, onRemove }: RowProps) {
  return (
    <div className="comparison-row-actions">
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
  return (
    <tr className={props.current ? "comparison-current" : ""}>
      <th scope="row">
        <TariffIdentity {...props} />
      </th>
      <td>
        <TariffTotal {...props} />
      </td>
      <td>
        <span className="component-cost">
          {cost ? money(cost.energy) : "—"}
        </span>
        <EnergyRates tariff={tariff} />
      </td>
      <td>
        <span className="component-cost">{cost ? money(cost.power) : "—"}</span>
        <PowerRates tariff={tariff} unit={props.unit} />
      </td>
      <td>
        <span className="component-cost">
          {cost ? money(otherCharges(cost)) : "—"}
        </span>
        <DetailsLink {...props} />
      </td>
      <td>
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
        className={`comparison-card${props.current ? " comparison-current" : ""}`}
        aria-label={tariff.name}
      >
        <div className="comparison-card-head">
          <div>
            <TariffIdentity {...props} />
          </div>
          <RowActions {...props} />
        </div>
        <div className="comparison-card-total">
          <TariffTotal {...props} />
        </div>
        {cost && (
          <dl className="comparison-card-lines">
            <div>
              <dt>
                <CostCategoryLabel category="energy">Energía</CostCategoryLabel>
              </dt>
              <dd>{money(cost.energy)}</dd>
            </div>
            <div>
              <dt>
                <CostCategoryLabel category="power">Potencia</CostCategoryLabel>
              </dt>
              <dd>{money(cost.power)}</dd>
            </div>
            <div>
              <dt>
                <CostCategoryLabel category="other">
                  Otros cargos e impuestos
                </CostCategoryLabel>
              </dt>
              <dd>{money(otherCharges(cost))}</dd>
            </div>
          </dl>
        )}
        <DetailsLink {...props} />
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
      <div className="comparison-frame">
        <table className="comparison-table" aria-label="Comparativa de tarifas">
          <thead>
            <tr>
              <th scope="col">Tarifa</th>
              <th scope="col">
                Total del período{" "}
                <small>y diferencia con tu tarifa actual</small>
              </th>
              <th scope="col">
                <CostCategoryLabel category="energy">Energía</CostCategoryLabel>
                <small>coste y precios sin impuestos</small>
              </th>
              <th scope="col">
                <CostCategoryLabel category="power">Potencia</CostCategoryLabel>
                <small>coste y precios sin impuestos</small>
              </th>
              <th scope="col">
                <CostCategoryLabel category="other">
                  Otros cargos
                </CostCategoryLabel>
                <small>
                  <CostCategoryLabel category="taxes">
                    e impuestos elegidos
                  </CostCategoryLabel>
                </small>
              </th>
              <th scope="col">
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
      <ol className="comparison-cards" aria-label="Comparativa de tarifas">
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
      <div className="modal-body tariff-detail-body">
        <p className="muted">
          {tariff.provider || "Comercializadora sin indicar"} ·{" "}
          {current ? "Tu tarifa actual" : "Oferta para comparar"}
        </p>
        {reason && <Alert role="note">{reason}</Alert>}
        <h3>Precios sin impuestos</h3>
        <EnergyRates tariff={tariff} />
        <PowerRates tariff={tariff} unit={unit} />
        <p className="small muted">
          Referencia de potencia: 1 kW en cada período. El coste usa tus kW
          contratados.
        </p>
        {cost && (
          <>
            <h3>Desglose del período</h3>
            <dl className="breakdown">
              {estimateLines([cost]).map(([key, label]) => (
                <div key={key}>
                  <dt>
                    <CostCategoryLabel category={billLineCategories[key]}>
                      {label}
                    </CostCategoryLabel>
                  </dt>
                  <dd>{money(cost[key])}</dd>
                </div>
              ))}
              <div className="total">
                <dt>Total del período</dt>
                <dd>{money(cost.total)}</dd>
              </div>
            </dl>
          </>
        )}
        <EstimateNotice tariff={tariff} />
        <details className="form-section">
          <summary>Validez y condiciones</summary>
          <p className="small">
            Oferta válida hasta:{" "}
            {tariff.validUntil
              ? shortDate(tariff.validUntil)
              : "Sin fecha indicada"}
          </p>
          <p className="small muted">
            Es la fecha límite para contratar la oferta, no la fecha de fin de
            tu contrato.
          </p>
          {tariff.notes && (
            <p className="tariff-detail-notes">{tariff.notes}</p>
          )}
          {tariff.url && (
            <a
              href={tariff.url}
              className="text-link"
              target="_blank"
              rel="noreferrer"
            >
              Ver oferta original <ExternalLink size={15} />
            </a>
          )}
        </details>
        <div className="tariff-detail-actions">
          {!current && (
            <div className="tariff-detail-register">
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
          <div className="tariff-detail-manage">
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
            <p id="tariff-detail-limit" className="small muted">
              {tariffLimitMessage}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
