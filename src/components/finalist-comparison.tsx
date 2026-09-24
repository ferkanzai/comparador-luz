import { type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { money, shortDate, type Profile, type Tariff } from "@/lib/domain";
import { estimateLines } from "@/lib/bill-data";
import CostCategoryLabel, {
  billLineCategories,
  type CostCategory,
} from "./cost-category-label";
import type { ComparisonRow } from "./comparison-table";
import { CostDifference, EnergyRates, PowerRates } from "./tariff-rates";
import { estimatedCharges } from "@/lib/charge-estimates";
import EstimateNotice from "./estimate-notice";
import { Modal } from "./ui";
import { TaxAssumptions } from "./profile-fields";
import { Badge } from "@/components/ui/badge";

export default function FinalistComparison({
  rows,
  currentId,
  baseline,
  unit,
  profile,
  simulation,
  onClose,
}: {
  rows: ComparisonRow[];
  currentId: string | null;
  baseline?: number;
  unit: Tariff["powerUnit"];
  profile: Profile;
  simulation: boolean;
  onClose: () => void;
}) {
  const detailRow = (
    label: string,
    value: (row: ComparisonRow) => ReactNode,
    category?: CostCategory,
  ) => (
    <tr key={label}>
      <th scope="row">
        {category ? (
          <CostCategoryLabel category={category}>{label}</CostCategoryLabel>
        ) : (
          label
        )}
      </th>
      {rows.map((row) => (
        <td key={row.tariff.id}>{value(row)}</td>
      ))}
    </tr>
  );
  return (
    <Modal
      title="Tus finalistas, frente a frente"
      onClose={onClose}
      wide
      className="finalist-modal"
    >
      <div className="modal-body finalist-body">
        <p className="muted">
          {profile.days || "—"} días · <TaxAssumptions profile={profile} />
          {simulation ? " · Simulación activa" : " · Tu perfil de consumo"}
        </p>
        <div
          className="comparison-scroll finalist-scroll"
          role="region"
          aria-label="Finalistas, desplazamiento horizontal"
          tabIndex={0}
        >
          <table
            className="finalist-table"
            aria-label="Comparación de finalistas"
          >
            <thead>
              <tr>
                <th scope="col">
                  Mismo consumo.
                  <br />
                  Todos los detalles.
                </th>
                {rows.map(({ tariff }) => (
                  <th key={tariff.id} scope="col">
                    <span className="comparison-provider">
                      {tariff.provider || "Sin comercializadora"}
                    </span>
                    <strong>{tariff.name}</strong>
                    {tariff.id === currentId && (
                      <Badge variant="outline" className="comparison-tag">
                        Tu tarifa actual
                      </Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRow("Total del período", ({ tariff, cost, reason }) =>
                cost ? (
                  <>
                    <strong className="comparison-amount">
                      {money(cost.total)}
                    </strong>
                    <CostDifference
                      total={cost.total}
                      baseline={baseline}
                      current={tariff.id === currentId}
                    />
                  </>
                ) : (
                  <span className="comparison-exclusion">{reason}</span>
                ),
              )}
              {estimateLines(rows.map((row) => row.cost)).map(([key, label]) =>
                detailRow(
                  label,
                  ({ cost }) => (cost ? money(cost[key]) : "—"),
                  billLineCategories[key],
                ),
              )}
              {detailRow(
                "Energía · precios sin impuestos",
                ({ tariff }) => (
                  <EnergyRates tariff={tariff} />
                ),
                "energy",
              )}
              {detailRow(
                "Potencia · precios sin impuestos",
                ({ tariff }) => (
                  <PowerRates tariff={tariff} unit={unit} />
                ),
                "power",
              )}
              {detailRow(
                "Referencia de potencia",
                () => (
                  <span className="small muted">
                    1 kW en cada período. El coste del período usa tus kW
                    contratados.
                  </span>
                ),
                "power",
              )}
              {detailRow(
                "Cargos estimados",
                ({ tariff }) =>
                  estimatedCharges(tariff) ? (
                    <EstimateNotice tariff={tariff} />
                  ) : (
                    "Ninguno"
                  ),
                "other",
              )}
              {detailRow("Validez de la oferta", ({ tariff }) =>
                tariff.validUntil
                  ? shortDate(tariff.validUntil)
                  : "Sin fecha indicada",
              )}
              {detailRow("Notas y condiciones", ({ tariff }) => (
                <span className="tariff-detail-notes">
                  {tariff.notes || "Sin información añadida"}
                </span>
              ))}
              {detailRow("Oferta original", ({ tariff }) =>
                tariff.url ? (
                  <a
                    className="text-link"
                    href={tariff.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver oferta <ExternalLink size={14} />
                  </a>
                ) : (
                  "Sin enlace"
                ),
              )}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Los precios unitarios no incluyen impuestos. La selección no cambia tu
          contrato ni tu tarifa de referencia.
        </p>
      </div>
    </Modal>
  );
}
