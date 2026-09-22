"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, History } from "lucide-react";
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
      <div className="section-heading">
        <div>
          <span className="eyebrow">CADA CAMBIO CUENTA</span>
          <h2>Tu recorrido, tarifa a tarifa.</h2>
          <p className="muted">
            Los precios que has tenido, con sus fechas. Completa tu historia a
            tu ritmo.
          </p>
        </div>
        <div className="tariff-history-actions">
          <button className="button primary" onClick={() => setChoosing(true)}>
            {workspace.currentId
              ? "Cambiar tarifa actual"
              : "Registrar tarifa actual"}
          </button>
          <button
            className="button secondary"
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
          <article
            className={`panel history-item ${period.current ? "current-history" : ""}`}
            key={period.id}
          >
            <div className="history-date">
              {period.current && (
                <span className="pill green">Tu tarifa actual</span>
              )}
              <div>Desde {shortDate(period.start)}</div>
              <span>
                {period.current
                  ? "Hasta hoy"
                  : `hasta ${shortDate(period.end)} (cambio)`}
              </span>
            </div>
            <div>
              <h3>{period.tariff.name}</h3>
              <p className="muted">{period.tariff.provider}</p>
              {periodProblem(period, periods) && (
                <p className="notice">
                  Revisa las fechas: {periodProblem(period, periods)}
                </p>
              )}
              <EstimateNotice tariff={period.tariff} />
              <EnergyRates tariff={period.tariff} />
              <details>
                <summary>Ver todos los precios</summary>
                <p className="small">
                  Potencia: {powerDescription(period.tariff)}
                  <br />
                  Alquiler: {period.tariff.meterDay || "—"} €/día · Bono social:{" "}
                  {period.tariff.socialDay || "—"} €/día · Coste SNOEE:{" "}
                  {period.tariff.snoeeKwh || "—"} €/kWh · Servicios:{" "}
                  {period.tariff.servicesMonth || "—"} €/mes
                </p>
                <p className="small muted">{period.tariff.notes}</p>
              </details>
              <div className="tariff-record-actions">
                <button
                  className="text-link"
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
                  Corregir datos
                </button>
                {period.current && (
                  <button
                    className="text-link"
                    onClick={() =>
                      setDraft({
                        tariff: period.tariff,
                        kind: "current",
                        title: "Registrar cambio de precios",
                      })
                    }
                  >
                    Registrar cambio de precios
                  </button>
                )}
                <button
                  className="text-link"
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
                  Volver a comparar
                </button>
                <button
                  className="text-link danger"
                  aria-label={`Eliminar registro de ${period.tariff.name}`}
                  onClick={() => setRemovingId(period.id)}
                >
                  Eliminar registro
                </button>
              </div>
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
