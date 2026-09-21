"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  billSchema,
  numberOf,
  shortDate,
  type Bill,
  type Workspace,
} from "@/lib/domain";
import { cents } from "@/lib/calculator";
import { billLines } from "@/lib/bill-data";
import { Field, Modal } from "./ui";
export default function BillForm({
  initial,
  workspace: w,
  onSave,
  onClose,
}: {
  initial: Bill;
  workspace: Workspace;
  onSave: (bill: Bill) => void | Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(initial);
  const [showPastTariffs, setShowPastTariffs] = useState(false);
  const [pastTariffMessage, setPastTariffMessage] = useState("");
  const pastTariffsId = useId();
  const tariffSelect = useRef<HTMLSelectElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      await onSave(result.data);
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
            hemos copiado el consumo y el desglose: puedes corregirlos antes de
            guardar.
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
            onChange={(credit) => {
              const gross = editing.breakdown
                ? Object.values(editing.breakdown).reduce(
                    (sum, v) => sum + numberOf(v),
                    0,
                  )
                : numberOf(editing.paid) + numberOf(editing.credit);
              setEditing({
                ...editing,
                credit,
                paid: Number.isFinite(gross - numberOf(credit))
                  ? String(cents(gross - numberOf(credit)))
                  : editing.paid,
              });
            }}
          />
          <Field
            label="Comercializadora"
            required
            value={editing.provider}
            onChange={(v) => setEditing({ ...editing, provider: v })}
          />
          <Field
            label="Consumo total (opcional)"
            decimal
            unit="kWh"
            value={editing.kwh}
            onChange={(v) => setEditing({ ...editing, kwh: v })}
          />
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
                          w.tariffs.find(
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
                {w.tariffs
                  .filter(
                    (t) => JSON.stringify(t) !== JSON.stringify(editing.tariff),
                  )
                  .map((t) => (
                    <option key={t.id} value={`live:${t.id}`}>
                      {t.name}
                      {t.id === editing.tariff?.id ? " · precios actuales" : ""}
                    </option>
                  ))}
              </optgroup>
            </select>
            <small>
              Se guarda una copia de los precios; los cambios futuros no alteran
              esta factura.
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
            <p className="small muted" role="status">
              {pastTariffMessage}
            </p>
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
                Copia los importes facturados. Al editar una línea, el total se
                actualiza con su suma menos el crédito aplicado.
              </p>
              <div className="form-grid two">
                {billLines.map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={editing.breakdown![key]}
                    decimal
                    unit="€"
                    required
                    onChange={(value) => {
                      const breakdown = { ...editing.breakdown!, [key]: value };
                      const values = Object.values(breakdown).map(numberOf);
                      setEditing({
                        ...editing,
                        breakdown,
                        paid: values.every(Number.isFinite)
                          ? String(
                              cents(
                                values.reduce((sum, n) => sum + n, 0) -
                                  numberOf(editing.credit),
                              ),
                            )
                          : editing.paid,
                      });
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {editing.profile && (
            <details className="form-section">
              <summary>Datos de consumo de esta factura</summary>
              <p className="small muted">
                {editing.profile.days} días · Punta: {editing.profile.peakKwh}{" "}
                kWh · Llano: {editing.profile.flatKwh} kWh · Valle:{" "}
                {editing.profile.valleyKwh} kWh · Potencia:{" "}
                {editing.profile.peakKw} / {editing.profile.valleyKw} kW. Esta
                copia no cambia al editar el comparador.
              </p>
            </details>
          )}
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
  );
}
