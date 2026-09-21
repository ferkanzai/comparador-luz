"use client";
import FeedbackNotice, { useFeedback } from "./feedback-notice";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  billSchema,
  numberOf,
  shortDate,
  money,
  newTariff,
  type Bill,
  type Workspace,
  type Tariff,
} from "@/lib/domain";
import { billLines, billReconciliation } from "@/lib/bill-data";
import { Field, Modal } from "./ui";
import EstimateNotice from "./estimate-notice";
import BillConsumptionFields from "./bill-consumption-fields";
import TariffForm from "./tariff-form";
import {
  billConsumption,
  consumptionTotal,
  updateBillConsumption,
} from "@/lib/bill-consumption";
import { newInvoiceProfile } from "@/lib/invoice-profile";
export default function BillForm({
  initial,
  workspace: w,
  onSave,
  onClose,
}: {
  initial: Bill;
  workspace: Workspace;
  onSave: (bill: Bill, newTariff?: Tariff) => void | Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<Bill>({
    ...initial,
    consumption: billConsumption(initial),
  });
  const [creatingTariff, setCreatingTariff] = useState<Tariff | null>(null);
  const [pendingTariff, setPendingTariff] = useState<Tariff | null>(null);
  const availableTariffs = pendingTariff
    ? [...w.tariffs, pendingTariff]
    : w.tariffs;
  const [showPastTariffs, setShowPastTariffs] = useState(false);
  const {
    message: pastTariffMessage,
    setMessage: setPastTariffMessage,
    dismiss: dismissPastTariff,
  } = useFeedback();
  const pastTariffsId = useId();
  const tariffSelect = useRef<HTMLSelectElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reconciliation = billReconciliation(editing);
  async function save(e: FormEvent) {
    e.preventDefault();
    const result = billSchema.safeParse(editing);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(
        result.data,
        pendingTariff?.id === result.data.tariff?.id
          ? (pendingTariff ?? undefined)
          : undefined,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Modal
        title={
          w.bills.some((b) => b.id === editing.id)
            ? "Editar factura"
            : "Registrar una factura"
        }
        onClose={() => {
          if (!saving) onClose();
        }}
      >
        <form className="modal-body" onSubmit={save}>
          <fieldset disabled={saving}>
            {editing.tariff && <EstimateNotice tariff={editing.tariff} />}
            <div className="form-grid two">
              <Field
                label="Inicio del periodo"
                type="date"
                value={editing.periodStart}
                onChange={(periodStart) =>
                  setEditing({ ...editing, periodStart })
                }
              />
              <Field
                label="Fin del periodo"
                type="date"
                value={editing.periodEnd}
                onChange={(periodEnd) =>
                  setEditing({
                    ...editing,
                    periodEnd,
                    ...(periodEnd ? { month: periodEnd.slice(0, 7) } : {}),
                  })
                }
              />
            </div>
            {editing.periodStart &&
              editing.periodEnd &&
              editing.periodEnd > editing.periodStart && (
                <p className="small muted">
                  {Math.round(
                    (Date.parse(editing.periodEnd) -
                      Date.parse(editing.periodStart)) /
                      86400000,
                  )}{" "}
                  días entre lecturas. Revisa las fechas de tu factura; no tiene
                  que coincidir con un mes natural.
                </p>
              )}

            <p className="muted">
              Revisa el importe real de tu factura. Si vienes del comparador, ya
              hemos copiado el consumo y el desglose: puedes corregirlos antes
              de guardar.
            </p>
            <div className="form-grid two">
              <Field
                label="Mes para el gráfico"
                hint="Por defecto, el mes en que termina el periodo. Puedes cambiarlo."
                type="month"
                required
                value={editing.month}
                onChange={(v) => setEditing({ ...editing, month: v })}
              />
              <Field
                label="Total pagado"
                signed
                required
                decimal
                unit="€"
                value={editing.paid}
                onChange={(v) => setEditing({ ...editing, paid: v })}
              />
            </div>
            <Field
              label="Crédito o descuento sobre el total (opcional)"
              decimal
              unit="€"
              hint="Importe positivo que se resta después de impuestos. Si el descuento reduce una base imponible, copia los conceptos e impuestos ya descontados de tu factura y no lo restes aquí otra vez."
              value={editing.credit}
              onChange={(credit) => setEditing({ ...editing, credit })}
            />
            <Field
              label="Comercializadora"
              required
              value={editing.provider}
              onChange={(v) => setEditing({ ...editing, provider: v })}
            />
            <BillConsumptionFields bill={editing} onChange={setEditing} />
            <label className="auth-label">
              Tarifa de esta factura
              <select
                ref={tariffSelect}
                value={editing.tariff ? "snapshot" : ""}
                onChange={(e) => {
                  setPastTariffMessage("");
                  setEditing({
                    ...editing,
                    tariff:
                      e.target.value === "snapshot"
                        ? editing.tariff
                        : structuredClone(
                            availableTariffs.find(
                              (t) => `live:${t.id}` === e.target.value,
                            ) ?? null,
                          ),
                  });
                }}
              >
                <option value="">Sin vincular</option>
                {editing.tariff && (
                  <option value="snapshot">
                    {editing.tariff.name} · precios de esta factura
                  </option>
                )}
                <optgroup label="Tarifas guardadas">
                  {availableTariffs
                    .filter(
                      (t) =>
                        JSON.stringify(t) !== JSON.stringify(editing.tariff),
                    )
                    .map((t) => (
                      <option key={t.id} value={`live:${t.id}`}>
                        {t.name}
                        {t.id === editing.tariff?.id
                          ? " · precios actuales"
                          : ""}
                      </option>
                    ))}
                </optgroup>
              </select>
              <small>
                Se guarda una copia de los precios; los cambios futuros no
                alteran esta factura. Comprueba que coincidan con los precios
                unitarios impresos en ella.
              </small>
            </label>
            {w.history.length > 0 && (
              <div className="past-tariff-picker">
                <button
                  type="button"
                  className="link-button"
                  aria-expanded={showPastTariffs}
                  aria-controls={pastTariffsId}
                  onClick={() => setShowPastTariffs(!showPastTariffs)}
                >
                  {showPastTariffs
                    ? "Ocultar tarifas anteriores"
                    : "Elegir una tarifa anterior"}
                </button>
                {showPastTariffs && (
                  <div id={pastTariffsId}>
                    <label className="auth-label">
                      Precios que tenías antes
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          const previous = w.history.find(
                            (h) => h.id === event.target.value,
                          );
                          if (!previous) return;
                          setEditing({
                            ...editing,
                            tariff: structuredClone(previous.tariff),
                          });
                          setPastTariffMessage(
                            `Precios de ${shortDate(previous.start)} a ${shortDate(previous.end)} vinculados. Los importes de la factura no cambian.`,
                          );
                          setShowPastTariffs(false);
                          tariffSelect.current?.focus();
                        }}
                      >
                        <option value="" disabled>
                          Selecciona la tarifa y el periodo
                        </option>
                        {[...w.history]
                          .sort((a, b) => b.end.localeCompare(a.end))
                          .map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.tariff.name} · {shortDate(h.start)}
                              {h.start === h.end
                                ? " · cambio de precios ese día"
                                : ` a ${shortDate(h.end)}`}
                            </option>
                          ))}
                      </select>
                      <small>
                        Vincula una copia de esos precios; los importes de la
                        factura no cambian.
                      </small>
                    </label>
                  </div>
                )}
              </div>
            )}
            {pastTariffMessage && (
              <FeedbackNotice
                key={pastTariffMessage.id}
                message={pastTariffMessage}
                onDismiss={dismissPastTariff}
              />
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!editing.breakdown}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    breakdown: e.target.checked
                      ? {
                          energy: "0",
                          power: "0",
                          social: "0",
                          meter: "0",
                          services: "0",
                          electricityTax: "0",
                          vat: "0",
                          servicesVat: "0",
                        }
                      : null,
                  })
                }
              />{" "}
              Guardar el desglose por conceptos
            </label>
            {editing.breakdown && (
              <>
                <p className="small muted">
                  Copia los importes facturados. Conservamos el total pagado que
                  has indicado y comprobamos que la suma menos el crédito
                  coincida, incluidos los impuestos.
                </p>
                <div className="bill-concepts">
                  {billLines.map(([key, label]) => (
                    <div key={key} className="bill-concept">
                      <Field
                        label={label}
                        value={editing.breakdown![key]}
                        decimal
                        unit="€"
                        required
                        onChange={(value) =>
                          setEditing({
                            ...editing,
                            breakdown: { ...editing.breakdown!, [key]: value },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div
                  className={`notice bill-reconciliation ${reconciliation?.difference ? "error" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {reconciliation ? (
                    <>
                      <p>
                        Suma de conceptos:{" "}
                        <strong>{money(reconciliation.gross)}</strong> ·
                        Crédito: {money(numberOf(editing.credit))}
                      </p>
                      <p>
                        Resultado del desglose:{" "}
                        <strong>{money(reconciliation.net)}</strong> · Total
                        pagado: {money(numberOf(editing.paid))}
                      </p>
                      {reconciliation.difference === 0 ? (
                        <strong>El desglose coincide con el total.</strong>
                      ) : (
                        <strong>
                          {reconciliation.difference > 0 ? "Sobran" : "Faltan"}{" "}
                          {money(Math.abs(reconciliation.difference))} en el
                          desglose. Revisa los importes antes de guardar.
                        </strong>
                      )}
                    </>
                  ) : (
                    <p>
                      Completa todos los importes del desglose y el total para
                      comprobar que coinciden. Usa 0 si un concepto no tiene
                      coste.
                    </p>
                  )}
                </div>
              </>
            )}
            <section className="form-section bill-invoice-tariff">
              <h3>Precios de esta factura</h3>
              <p className="small muted">
                Un importe parecido no confirma que la tarifa sea la misma. Si
                los precios unitarios son distintos, puedes guardar una tarifa
                con los que aparecen en tu factura.
              </p>
              <button
                type="button"
                className="link-button"
                disabled={availableTariffs.length >= 100}
                onClick={() =>
                  setCreatingTariff({
                    ...newTariff(),
                    provider: editing.provider,
                  })
                }
              >
                Crear tarifa con estos precios
              </button>
              <p className="small muted">
                Se guardará junto con la factura, sin cambiar tu contrato
                actual.
              </p>
            </section>
            <Field
              label="Notas (opcional)"
              value={editing.notes}
              onChange={(v) => setEditing({ ...editing, notes: v })}
              maxLength={2000}
            />
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button type="submit" className="button primary">
                {saving ? "Guardando factura…" : "Guardar factura"}
              </button>
            </div>
          </fieldset>
        </form>
      </Modal>
      {creatingTariff && (
        <TariffForm
          initial={creatingTariff}
          invoiceDraft
          initialProfile={newInvoiceProfile(editing)}
          firstTariff={false}
          isCurrent={false}
          currentSince=""
          onClose={() => setCreatingTariff(null)}
          onSave={(tariff, _since, profile) => {
            setPendingTariff(tariff);
            const consumption = {
              peakKwh: profile.peakKwh,
              flatKwh: profile.flatKwh,
              valleyKwh: profile.valleyKwh,
            };
            const next = { ...editing, tariff, profile };
            setEditing(
              consumptionTotal(consumption) !== null
                ? updateBillConsumption(next, consumption)
                : next,
            );
            setCreatingTariff(null);
          }}
        />
      )}
    </>
  );
}
