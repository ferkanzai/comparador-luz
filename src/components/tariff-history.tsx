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
} from "lucide-react";
import {
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
import EstimateNotice from "./estimate-notice";
import { EnergyRates } from "./comparison-table";
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
        {periods.map((period) => (
          <article className="tariff-record" key={period.id}>
            <div className="tariff-record-identity">
              <span
                className={`record-status ${period.current ? "is-current" : ""}`}
              >
                {period.current ? "Tu tarifa actual" : "Tarifa anterior"}
              </span>
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
                Energía <span>· sin impuestos</span>
              </p>
              <EnergyRates tariff={period.tariff} />
              <details className="record-price-details">
                <summary>
                  <ChevronDown size={14} /> Potencia y otros cargos
                </summary>
                <dl className="record-extra-prices">
                  <div>
                    <dt>Potencia</dt>
                    <dd>{powerDescription(period.tariff)}</dd>
                  </div>
                  <div>
                    <dt>Alquiler</dt>
                    <dd>
                      {period.tariff.meterDay.replace(".", ",") || "—"} €/día
                    </dd>
                  </div>
                  <div>
                    <dt>Bono social</dt>
                    <dd>
                      {period.tariff.socialDay.replace(".", ",") || "—"} €/día
                    </dd>
                  </div>
                  <div>
                    <dt>Coste SNOEE</dt>
                    <dd>
                      {period.tariff.snoeeKwh.replace(".", ",") || "—"} €/kWh
                    </dd>
                  </div>
                  <div>
                    <dt>Servicios</dt>
                    <dd>
                      {period.tariff.servicesMonth.replace(".", ",") || "—"}{" "}
                      €/mes
                    </dd>
                  </div>
                </dl>
                {period.tariff.notes && (
                  <p className="small muted">{period.tariff.notes}</p>
                )}
              </details>
              <EstimateNotice tariff={period.tariff} />
              {periodProblem(period, periods) && (
                <p className="notice">
                  Revisa las fechas: {periodProblem(period, periods)}
                </p>
              )}
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
        ))}
      </div>
      {!periods.length && (
        <div className="panel">
          <Empty icon={<History size={26} />} title="Tu historia empieza aquí.">
            Añade los precios y las fechas de una tarifa que hayas tenido.
          </Empty>
        </div>
      )}
      {removing && (
        <Modal title="Eliminar registro" onClose={() => setRemovingId(null)}>
          <div className="modal-body">
            <p>
              Eliminarás <strong>{removing.tariff.name}</strong>, desde{" "}
              {shortDate(removing.start)}{" "}
              {removing.current
                ? "hasta hoy"
                : `hasta ${shortDate(removing.end)}`}
              .
            </p>
            <p>
              {removing.current
                ? "Te quedarás sin tarifa actual hasta que registres otra. No reactivaremos una tarifa anterior."
                : "Quedará un hueco en tu historial. No cambiaremos las fechas de otras tarifas."}{" "}
              Las facturas guardadas no cambian.
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setRemovingId(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                onClick={() => {
                  update(removePeriod(workspace, removing.id));
                  setRemovingId(null);
                }}
              >
                Eliminar registro
              </button>
            </div>
          </div>
        </Modal>
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
