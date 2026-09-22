import { ArrowUpRight, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  comparablePowerPrice,
  formatPowerPrice,
  money,
  powerDescription,
  powerUnitLabels,
  shortDate,
  type Tariff,
} from "@/lib/domain";
import { type Calculation, cents } from "@/lib/calculator";
import { estimatedCharges } from "@/lib/charge-estimates";
import { billLines } from "@/lib/bill-data";
import CostCategoryLabel, { billLineCategories } from "./cost-category-label";
import EstimateNotice from "./estimate-notice";
import { Modal } from "./ui";

export type ComparisonRow = {
  tariff: Tariff;
  cost: Calculation | null;
  reason: string;
};
export type TariffActions = {
  onEdit: (tariff: Tariff) => void;
  onDuplicate: (tariff: Tariff) => void;
  onCurrent: (tariff: Tariff) => void;
  onRemove: (tariff: Tariff) => void;
  onReview: (tariff: Tariff) => void;
};

export function EnergyRates({ tariff }: { tariff: Tariff }) {
  const rates =
    tariff.kind === "fixed"
      ? [["24 h", tariff.energyPeak]]
      : [
          ["Punta", tariff.energyPeak],
          ["Llano", tariff.energyFlat],
          ["Valle", tariff.energyValley],
        ];
  return (
    <dl className="comparison-rates">
      {rates.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value.replace(".", ",") || "—"} <span>€/kWh</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PowerRates({
  tariff,
  unit,
}: {
  tariff: Tariff;
  unit: Tariff["powerUnit"];
}) {
  return (
    <div className="comparison-power">
      <div>
        <strong>{formatPowerPrice(comparablePowerPrice(tariff, unit))}</strong>{" "}
        {powerUnitLabels[unit]}
      </div>
      <p>Original: {powerDescription(tariff)}</p>
    </div>
  );
}

export function CostDifference({
  total,
  baseline,
  current,
}: {
  total: number;
  baseline?: number;
  current: boolean;
}) {
  if (current) return <span className="cost-reference">Tu referencia</span>;
  if (baseline === undefined)
    return <span className="cost-reference">Sin tarifa de referencia</span>;
  const difference = cents(baseline - total);
  return (
    <span
      className={
        difference > 0
          ? "cost-saving"
          : difference < 0
            ? "cost-increase"
            : "cost-reference"
      }
    >
      {difference === 0
        ? "Mismo coste"
        : `${difference > 0 ? "Ahorras" : "Pagas más"} ${money(Math.abs(difference))}`}
    </span>
  );
}

export default function ComparisonTable({
  rows,
  currentId,
  unit,
  onDetails,
  onEdit,
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
}) {
  const baseline = rows.find((row) => row.tariff.id === currentId)?.cost?.total;
  const best = rows.find((row) => row.cost)?.cost?.total;
  return (
    <div
      className="comparison-scroll"
      role="region"
      aria-label="Tabla de tarifas, desplazamiento horizontal"
      tabIndex={0}
    >
      <table className="comparison-table" aria-label="Comparativa de tarifas">
        <thead>
          <tr>
            <th scope="col">Tarifa</th>
            <th scope="col">
              Total del período <small>y diferencia con tu tarifa actual</small>
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
          {rows.map(({ tariff, cost, reason }) => {
            const current = tariff.id === currentId;
            const cheapest = cost !== null && cost.total === best;
            return (
              <tr
                key={tariff.id}
                className={current ? "comparison-current" : ""}
              >
                <th scope="row">
                  <input
                    className="finalist-checkbox"
                    type="checkbox"
                    aria-label={`Comparar ${tariff.name}`}
                    checked={selectedIds.includes(tariff.id)}
                    disabled={
                      selectedIds.length >= 3 &&
                      !selectedIds.includes(tariff.id)
                    }
                    onChange={() => onToggle(tariff.id)}
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
                      <span className="comparison-tag">Tu tarifa actual</span>
                    )}
                    {cheapest && (
                      <span className="comparison-tag best">Menor coste</span>
                    )}
                    {estimatedCharges(tariff) && (
                      <span className="comparison-tag approximate">
                        Cargos estimados
                      </span>
                    )}
                  </div>
                </th>
                <td>
                  {cost ? (
                    <>
                      <strong className="comparison-amount">
                        {money(cost.total)}
                      </strong>
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
                  )}
                </td>
                <td>
                  <span className="component-cost">
                    {cost ? money(cost.energy) : "—"}
                  </span>
                  <EnergyRates tariff={tariff} />
                </td>
                <td>
                  <span className="component-cost">
                    {cost ? money(cost.power) : "—"}
                  </span>
                  <PowerRates tariff={tariff} unit={unit} />
                </td>
                <td>
                  <span className="component-cost">
                    {cost
                      ? money(
                          cents(
                            cost.social +
                              cost.snoee +
                              cost.meter +
                              cost.services +
                              cost.electricityTax +
                              cost.vat +
                              cost.servicesVat,
                          ),
                        )
                      : "—"}
                  </span>
                  <button
                    className="comparison-detail-link"
                    onClick={() => onDetails(tariff.id)}
                    aria-label={`Ver desglose de ${tariff.name}`}
                  >
                    Ver desglose <ArrowUpRight size={13} />
                  </button>
                </td>
                <td>
                  <button
                    className="icon-button"
                    onClick={() => onEdit(tariff)}
                    aria-label={`Editar ${tariff.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TariffDetails({
  row: { tariff, cost, reason },
  current,
  unit,
  actions,
  onClose,
}: {
  row: ComparisonRow;
  current: boolean;
  unit: Tariff["powerUnit"];
  actions: TariffActions;
  onClose: () => void;
}) {
  return (
    <Modal title={tariff.name} onClose={onClose}>
      <div className="modal-body tariff-detail-body">
        <p className="muted">
          {tariff.provider || "Comercializadora sin indicar"} ·{" "}
          {current ? "Tu tarifa actual" : "Oferta para comparar"}
        </p>
        {reason && <p className="notice">{reason}</p>}
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
              {billLines.map(([key, label]) => (
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
        <h3>Oferta y revisión personal</h3>
        <p className="small">
          Validez de la oferta:{" "}
          {tariff.validUntil
            ? shortDate(tariff.validUntil)
            : "Sin fecha indicada"}
        </p>
        <p className="small">
          Última revisión por ti:{" "}
          {tariff.checkedOn
            ? shortDate(tariff.checkedOn)
            : "Sin fecha registrada"}
        </p>
        {!tariff.checkedOn && (
          <>
            <p className="small muted">
              Registra que has revisado los precios en tu factura o en la
              oferta. La aplicación no los comprueba.
            </p>
            <button
              className="button secondary small-button"
              onClick={() => actions.onReview(tariff)}
            >
              He revisado estos precios
            </button>
          </>
        )}
        {tariff.notes && <p className="tariff-detail-notes">{tariff.notes}</p>}
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
        <div className="tariff-detail-actions">
          <button
            className="button secondary"
            onClick={() => {
              onClose();
              actions.onEdit(tariff);
            }}
          >
            <Pencil size={16} />
            Editar tarifa
          </button>
          <button
            className="button secondary"
            onClick={() => {
              onClose();
              actions.onDuplicate(tariff);
            }}
          >
            <Copy size={16} />
            Duplicar
          </button>
          {!current && (
            <>
              <button
                className="button primary"
                onClick={() => {
                  onClose();
                  actions.onCurrent(tariff);
                }}
              >
                Es mi tarifa actual
              </button>
              <button
                className="text-link danger"
                onClick={() => {
                  actions.onRemove(tariff);
                  onClose();
                }}
              >
                <Trash2 size={16} />
                Eliminar tarifa
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
