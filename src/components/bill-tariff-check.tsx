"use client";
import { useState } from "react";
import { money, type Bill, type Workspace } from "@/lib/domain";
import {
  billCheckSignature,
  checkBillTariff,
  newInvoiceProfile,
} from "@/lib/bill-tariff-check";
import { Field } from "./ui";
import { TaxFields } from "./profile-fields";

export default function BillTariffCheck({
  bill,
  workspace,
  onChange,
  onCreate,
}: {
  bill: Bill;
  workspace: Workspace;
  onChange: (bill: Bill) => void;
  onCreate: () => void;
}) {
  const [reason, setReason] = useState(
    "He comprobado el contrato y es correcto",
  );
  const result = checkBillTariff(bill, workspace);
  const signature = billCheckSignature(bill);
  const accepted = bill.tariffReview?.signature === signature;
  return (
    <section
      className="form-section bill-tariff-check"
      aria-label="Comprobación orientativa de tarifa"
    >
      <h3>¿Encaja con tu tarifa?</h3>
      <p className="small muted">
        Una comprobación orientativa. No cambia tu total ni impide guardar una
        factura que sabes que es correcta.
      </p>
      <details className="check-inputs">
        <summary>Potencia y datos para comprobar esta factura</summary>
        {!bill.profile ? (
          <>
            <p className="small muted">
              Para estimar necesitamos los kW contratados y los días. Sin
              desglose de importes, también los tipos de impuestos de esa
              factura.
            </p>
            <button
              type="button"
              className="link-button"
              onClick={() =>
                onChange({ ...bill, profile: newInvoiceProfile(bill) })
              }
            >
              Añadir datos de comprobación
            </button>
          </>
        ) : (
          <>
            <div className="form-grid two">
              <Field
                label="Potencia facturada P1 · Punta"
                decimal
                unit="kW"
                value={bill.profile.peakKw}
                onChange={(peakKw) =>
                  onChange({ ...bill, profile: { ...bill.profile!, peakKw } })
                }
              />
              <Field
                label="Potencia facturada P2 · Valle"
                decimal
                unit="kW"
                value={bill.profile.valleyKw}
                onChange={(valleyKw) =>
                  onChange({ ...bill, profile: { ...bill.profile!, valleyKw } })
                }
              />
            </div>
            {bill.periodStart && bill.periodEnd ? (
              <p className="small muted">
                Calculamos los días entre las fechas de esta factura.
              </p>
            ) : (
              <Field
                label="Días facturados"
                decimal
                unit="días"
                value={bill.profile.days}
                onChange={(days) =>
                  onChange({ ...bill, profile: { ...bill.profile!, days } })
                }
              />
            )}
            {!bill.breakdown && (
              <TaxFields
                value={bill.profile}
                onChange={(profile) => onChange({ ...bill, profile })}
              />
            )}
            <p className="small muted">
              Estos datos pertenecen a esta factura. El consumo y las fechas de
              arriba tienen prioridad sobre la copia original del comparador.
            </p>
          </>
        )}
      </details>
      {!bill.tariff ? (
        <p className="small muted">
          Selecciona una tarifa para compararla o registra sus precios.
        </p>
      ) : !result ? (
        <p className="small muted">
          Faltan datos para estimar: revisa los kWh, la potencia y los días. Las
          tarifas por periodos necesitan los tres consumos. Sin desglose, indica
          IVA e IEE de la factura.
        </p>
      ) : (
        <div
          className={`notice ${result.mismatch && !accepted ? "tariff-check-warning" : ""}`}
        >
          <p>
            <strong>
              {result.mismatch
                ? "El importe se aleja de esta tarifa"
                : "El importe encaja aproximadamente"}
            </strong>
          </p>
          <p>
            {result.preTax
              ? "Conceptos antes de impuestos"
              : "Total después del crédito"}
            : facturado <strong>{money(result.actual)}</strong> · estimado{" "}
            <strong>{money(result.expected)}</strong>.
          </p>
          <p className="small">
            Diferencia: {money(Math.abs(result.difference))}. Avisamos si supera
            el mayor de 2 € o el 5 % del importe comparado.
          </p>
          <p className="small muted">
            {result.preTax
              ? "Comparamos sin impuestos, así que un IVA o IEE distinto no genera este aviso."
              : "Usamos los tipos de impuestos guardados en esta factura. Revisa los del periodo, incluidos los tipos reducidos si correspondían."}{" "}
            También pueden influir descuentos, cargos incluidos o cambios de
            precio dentro de la factura.
          </p>
          {result.mismatch && (
            <>
              {result.splitPrices && (
                <p className="small">
                  Hay tramos de energía o potencia: una sola tarifa puede no
                  reproducir el periodo completo. No sugerimos sustituciones
                  automáticas para este caso.
                </p>
              )}
              {!accepted && result.suggestions.length > 0 && (
                <div className="tariff-suggestions">
                  <strong className="small">
                    Otras tarifas se acercan más
                  </strong>
                  <p className="small muted">
                    El parecido del importe no confirma el contrato. Revisa los
                    precios antes de elegir.
                  </p>
                  {result.suggestions.map((candidate, index) => (
                    <button
                      type="button"
                      key={index}
                      className="button secondary"
                      onClick={() =>
                        onChange({
                          ...bill,
                          tariff: structuredClone(candidate.tariff),
                        })
                      }
                    >
                      Vincular {candidate.tariff.name} ·{" "}
                      {money(candidate.expected)}
                      <small>{candidate.source}</small>
                    </button>
                  ))}
                </div>
              )}
              {accepted ? (
                <p className="small" role="status">
                  Mantienes esta tarifa: {bill.tariffReview!.reason}.{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      onChange({ ...bill, tariffReview: undefined })
                    }
                  >
                    Revisar de nuevo
                  </button>
                </p>
              ) : (
                <div className="tariff-acceptance">
                  <label className="auth-label">
                    Motivo para mantenerla
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      <option>Impuestos del periodo distintos</option>
                      <option>Cambios de precio dentro de la factura</option>
                      <option>Descuentos o cargos diferentes</option>
                      <option>He comprobado el contrato y es correcto</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      onChange({ ...bill, tariffReview: { signature, reason } })
                    }
                  >
                    Sí, es la tarifa correcta · Mantenerla
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className="link-button"
        onClick={onCreate}
        disabled={workspace.tariffs.length >= 100}
      >
        Crear una tarifa con los precios de esta factura
      </button>
      <p className="small muted">
        La nueva tarifa se guardará junto con la factura; no cambiará tu
        contrato actual.
      </p>
    </section>
  );
}
