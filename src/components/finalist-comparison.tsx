import { type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { money, shortDate, type Profile, type Tariff } from "@/lib/domain";
import { estimateLines } from "@/lib/bill-data";
import CostCategoryLabel, {
  billLineCategories,
  type CostCategory,
} from "./cost-category-label";
import {
  amount,
  exclusion,
  provider,
  textLink,
  type ComparisonRow,
} from "./comparison-table";
import { CostDifference, EnergyRates, PowerRates } from "./tariff-rates";
import { estimatedCharges } from "@/lib/charge-estimates";
import EstimateNotice from "./estimate-notice";
import { Modal } from "./ui";
import { TaxAssumptions } from "./profile-fields";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const cell =
  "min-w-[220px] border-b border-border px-5 py-3.5 text-left align-top text-sm max-[600px]:min-w-[195px] max-[600px]:p-3";
/* The first column stays put while the table scrolls sideways. */
const firstCell =
  "sticky left-0 z-1 w-[160px] max-w-[180px] min-w-[160px] border-r border-r-border bg-inverse-foreground text-xs max-[600px]:max-w-[105px] max-[600px]:min-w-[105px] max-[600px]:px-2 max-[600px]:py-3 max-[600px]:text-3xs";
const headCell = cn(
  cell,
  "sticky top-0 z-2 bg-inverse-foreground font-medium tracking-[0.8px] text-muted-foreground uppercase",
);
const bodyCell = cn(cell, "group-last/row:border-b-0");

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
    <tr key={label} className="group/row">
      <th
        scope="row"
        className={cn(
          bodyCell,
          firstCell,
          "font-medium tracking-[0.8px] text-muted-foreground uppercase",
        )}
      >
        {category ? (
          <CostCategoryLabel category={category}>{label}</CostCategoryLabel>
        ) : (
          label
        )}
      </th>
      {rows.map((row) => (
        <td key={row.tariff.id} className={bodyCell}>
          {value(row)}
        </td>
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
      <div className="p-6 max-[520px]:p-5">
        <p className="m-0 mb-5 text-sm-plus text-muted-foreground">
          {profile.days || "—"} días · <TaxAssumptions profile={profile} />
          {simulation ? " · Simulación activa" : " · Tu perfil de consumo"}
        </p>
        <div
          className="max-h-[60vh] max-w-full isolate overflow-auto overscroll-auto rounded-lg border border-border bg-card focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary"
          role="region"
          aria-label="Finalistas, desplazamiento horizontal"
          tabIndex={0}
        >
          <table
            className="w-full border-separate border-spacing-0 text-left text-base leading-[1.45]"
            aria-label="Comparación de finalistas"
          >
            <thead>
              <tr>
                <th scope="col" className={cn(headCell, firstCell, "z-3")}>
                  Mismo consumo.
                  <br />
                  Todos los detalles.
                </th>
                {rows.map(({ tariff }) => (
                  <th key={tariff.id} scope="col" className={headCell}>
                    <span className={provider}>
                      {tariff.provider || "Sin comercializadora"}
                    </span>
                    <strong className="font-bold">{tariff.name}</strong>
                    {tariff.id === currentId && (
                      <Badge variant="outline" className="mt-2">
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
                    <strong className={amount}>{money(cost.total)}</strong>
                    <CostDifference
                      total={cost.total}
                      baseline={baseline}
                      current={tariff.id === currentId}
                    />
                  </>
                ) : (
                  <span className={exclusion}>{reason}</span>
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
                  <EnergyRates tariff={tariff} className="text-xs" />
                ),
                "energy",
              )}
              {detailRow(
                "Potencia · precios sin impuestos",
                ({ tariff }) => (
                  <PowerRates tariff={tariff} unit={unit} size="finalist" />
                ),
                "power",
              )}
              {detailRow(
                "Referencia de potencia",
                () => (
                  <span className="text-sm wrap-anywhere text-muted-foreground">
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
                    <EstimateNotice tariff={tariff} className="m-0" />
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
                <span className="wrap-anywhere whitespace-pre-wrap">
                  {tariff.notes || "Sin información añadida"}
                </span>
              ))}
              {detailRow("Oferta original", ({ tariff }) =>
                tariff.url ? (
                  <a
                    className={textLink}
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
        <p className="m-0 mt-4 text-sm-plus text-muted-foreground">
          Los precios unitarios no incluyen impuestos. La selección no cambia tu
          contrato ni tu tarifa de referencia.
        </p>
      </div>
    </Modal>
  );
}
