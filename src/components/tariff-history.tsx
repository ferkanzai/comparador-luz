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
import {
  tariffPeriods,
  periodProblem,
  comparePeriod,
  removePeriod,
} from "@/lib/tariff-periods";
import { Empty, Modal } from "./ui";
import ConfirmDialog from "./confirm-dialog";
import EstimateNotice from "./estimate-notice";
import CostCategoryLabel from "./cost-category-label";
import { estimatedCharges } from "@/lib/charge-estimates";
import { formatTariffPrice } from "@/lib/tariff-price-format";
import { EnergyRates } from "./tariff-rates";
import TariffPriceComparison from "./tariff-price-comparison";

import type { TariffRecordDraft } from "./tariff-record-form";
const TariffRecordForm = dynamic(() => import("./tariff-record-form"));

export default function TariffHistory({
  workspace,
  update,
  onCompare,
}: {
  workspace: Workspace;
  update: (w: Workspace) => void;
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
      <div className="tariff-ledger-heading">
        <div>
          <h2>Mis tarifas</h2>
          <p className="muted">Tus contratos y sus precios, en orden.</p>
        </div>
        <div className="tariff-history-actions">
          <button className="button primary" onClick={() => setChoosing(true)}>
            {workspace.currentId
              ? "Cambiar tarifa actual"
              : "Registrar tarifa actual"}
          </button>
          <button
            className="ledger-add"
            onClick={() =>
              setDraft({
                tariff: newTariff(),
                kind: "historical",
                title: "Añadir tarifa anterior",
              })
            }
          >
            <Plus size={16} />
            Añadir tarifa anterior
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {periods.length > 0 && <TariffPriceComparison periods={periods} />}
      <div className="history-list">
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
            <article className="tariff-record" key={period.id}>
              <div className="tariff-record-identity">
                <div className="record-heading-line">
                  <span
                    className={`record-status ${period.current ? "is-current" : ""}`}
                  >
                    {period.current ? "Tu tarifa actual" : "Tarifa anterior"}
                  </span>
                  {problem && (
                    <details
                      className="record-date-notice"
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
                      >
                        <TriangleAlert size={13} /> Revisar fechas
                      </summary>
                      <div className="record-date-explanation">
                        <p>{problem}</p>
                        <p>Usa «Corregir datos» para ajustar este período.</p>
                      </div>
                    </details>
                  )}
                </div>
                <h3>{period.tariff.name}</h3>
                <p className="record-provider">{period.tariff.provider}</p>
                <p className="record-dates">
                  <span>{shortDate(period.start)}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> hasta </span>
                  <span>{period.current ? "Hoy" : shortDate(period.end)}</span>
                </p>
              </div>
              <div className="tariff-record-prices">
                <p className="record-price-label">
                  <CostCategoryLabel category="energy">
                    Energía
                  </CostCategoryLabel>{" "}
                  <span>· sin impuestos</span>
                </p>
                <EnergyRates tariff={period.tariff} compact />
                <details className="record-price-details">
                  <summary>
                    <ChevronDown size={14} /> Potencia y otros cargos
                    {hasEstimates && (
                      <span className="record-estimate-label">
                        Incluye estimaciones
                      </span>
                    )}
                  </summary>
                  <dl className="record-extra-prices">
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
                    <div className="record-original-energy">
                      <p>Precios de energía originales · sin redondear</p>
                      <EnergyRates tariff={period.tariff} />
                    </div>
                  )}
                  {hasEstimates && <EstimateNotice tariff={period.tariff} />}
                  {period.tariff.notes && (
                    <p className="small muted">{period.tariff.notes}</p>
                  )}
                </details>
              </div>
              <div className="tariff-record-actions">
                <button
                  className="record-edit"
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
                  <Pencil size={14} /> Corregir datos
                </button>
                {period.current && (
                  <button
                    className="record-change"
                    onClick={() =>
                      setDraft({
                        tariff: period.tariff,
                        kind: "current",
                        title: "Registrar cambio de precios",
                      })
                    }
                  >
                    <RefreshCw size={14} /> Registrar cambio de precios
                  </button>
                )}
                <button
                  className="record-compare"
                  onClick={() => {
                    try {
                      update(comparePeriod(workspace, period.id));
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
                  Volver a comparar <ArrowUpRight size={14} />
                </button>
                <button
                  className="record-remove"
                  aria-label={`Eliminar registro de ${period.tariff.name}`}
                  title="Eliminar registro"
                  onClick={() => setRemovingId(period.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!periods.length && (
        <div className="panel">
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
              <p className="muted">
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
              <p className="muted">Las facturas guardadas no cambian.</p>
            </>
          }
          confirmLabel="Eliminar registro"
          onConfirm={() => {
            update(removePeriod(workspace, removing.id));
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
          <div className="modal-body">
            <p>
              Elige una oferta del comparador o introduce los precios de tu
              contrato. Esta acción no cambia tu compañía.
            </p>
            <div className="tariff-choice-list">
              {workspace.tariffs
                .filter((t) => t.id !== workspace.currentId)
                .map((tariff) => (
                  <button
                    className="button secondary"
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
                  </button>
                ))}
            </div>
            <button
              className="button primary"
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
            </button>
          </div>
        </Modal>
      )}
      {draft && (
        <TariffRecordForm
          workspace={workspace}
          draft={draft}
          update={update}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
}
