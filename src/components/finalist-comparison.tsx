import { type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { money, shortDate, type Profile, type Tariff } from "@/lib/domain";
import { billLines } from "@/lib/bill-data";
import {
  CostDifference,
  EnergyRates,
  PowerRates,
  type ComparisonRow,
} from "./comparison-table";
import { estimatedCharges } from "@/lib/charge-estimates";
import EstimateNotice from "./estimate-notice";
import { Modal } from "./ui";

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
  ) => (
    <tr key={label}>
      <th scope="row">{label}</th>
      {rows.map((row) => (
        <td key={row.tariff.id}>{value(row)}</td>
      ))}
    </tr>
  );
  return (
    <Modal title="Tus finalistas, frente a frente" onClose={onClose} wide>
      <div className="modal-body finalist-body">
        <p className="muted">
          {profile.days || "—"} días ·{" "}
          {profile.taxes ? "Con los impuestos elegidos" : "Sin impuestos"}
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
                      <span className="comparison-tag">Tu tarifa actual</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRow("Total del periodo", ({ tariff, cost, reason }) =>
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
              {billLines.map(([key, label]) =>
                detailRow(label, ({ cost }) => (cost ? money(cost[key]) : "—")),
              )}
              {detailRow("Energía · precios sin impuestos", ({ tariff }) => (
                <EnergyRates tariff={tariff} />
              ))}
              {detailRow("Potencia · precios sin impuestos", ({ tariff }) => (
                <PowerRates tariff={tariff} unit={unit} />
              ))}
              {detailRow("Referencia de potencia", () => (
                <span className="small muted">
                  1 kW en cada periodo. El coste del periodo usa tus kW
                  contratados.
                </span>
              ))}
              {detailRow("Cargos estimados", ({ tariff }) =>
                estimatedCharges(tariff) ? (
                  <EstimateNotice tariff={tariff} />
                ) : (
                  "Ninguno"
                ),
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
