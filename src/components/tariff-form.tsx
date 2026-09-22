"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Copy } from "lucide-react";
import {
  tariffSchema,
  today,
  money,
  powerUnitLabels,
  type Profile,
  type Tariff,
} from "@/lib/domain";
import { Field, Modal } from "./ui";
import { ProfileFields, TaxFields } from "./profile-fields";
import InvoicePrices from "./invoice-prices";
import { calculate } from "@/lib/calculator";
import { billLines } from "@/lib/bill-data";
import {
  estimateMeter,
  estimateSocial,
  meterEstimateSource,
  meterEstimates,
  socialEstimate2026,
} from "@/lib/charge-estimates";
import EstimateNotice from "./estimate-notice";
export default function TariffForm({
  initial,
  initialProfile,
  firstTariff,
  isCurrent,
  currentSince,
  invoiceDraft = false,
  duplicatedFrom,
  onSave,
  onClose,
}: {
  initial: Tariff;
  initialProfile: Profile;
  firstTariff: boolean;
  isCurrent: boolean;
  currentSince: string;
  invoiceDraft?: boolean;
  duplicatedFrom?: string;
  onSave: (
    t: Tariff,
    since: string,
    profile: Profile,
    makeCurrent: boolean,
  ) => void;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [makeCurrent, setMakeCurrent] = useState(firstTariff);
  const [tariff, setTariff] = useState(initial);
  const [since, setSince] = useState(today());
  const [error, setError] = useState("");
  const update = (key: keyof Tariff, value: string | boolean) =>
    setTariff((t) => ({
      ...t,
      [key]: value,
      ...(key === "meterDay" ? { meterEstimate: "none" as const } : {}),
      ...(key === "socialDay" ? { socialEstimate: "none" as const } : {}),
    }));
  const numeric = (
    key: keyof Tariff,
    label: string,
    unit: string,
    required = false,
  ) => (
    <Field
      key={key}
      label={label}
      value={String(tariff[key])}
      onChange={(v) => update(key, v)}
      unit={unit}
      decimal
      required={required}
    />
  );
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = tariffSchema.safeParse(tariff);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (isCurrent && (since < currentSince || since > today())) {
      setError(
        "La fecha debe estar entre el inicio del contrato actual y hoy.",
      );
      return;
    }
    onSave(result.data, since, profile, makeCurrent);
  }
  const cost = calculate(tariff, profile);
  return (
    <Modal
      title={
        duplicatedFrom
          ? "Duplicar tarifa"
          : initial.name
            ? "Editar tarifa"
            : "Añadir una tarifa"
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="modal-body">
        {duplicatedFrom && (
          <div className="tariff-copy-notice">
            <Copy size={20} aria-hidden="true" />
            <div>
              <strong>A partir de {duplicatedFrom}</strong>
              <p>
                La copia conserva los precios, las fechas y las condiciones.
                Revisa los datos y dale un nombre antes de guardarla como una
                nueva tarifa.
              </p>
            </div>
          </div>
        )}
        <p className="muted">
          Copia los precios <strong>sin impuestos</strong> de tu factura u
          oferta, con todos sus decimales. Usa 0 cuando un término no tenga
          coste.
        </p>
        {firstTariff && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={makeCurrent}
              onChange={(e) => setMakeCurrent(e.target.checked)}
            />{" "}
            Esta es mi tarifa actual
          </label>
        )}
        <div className="form-grid two">
          <Field
            label="Nombre de la tarifa"
            value={tariff.name}
            onChange={(v) => update("name", v)}
            required
            placeholder="Por ejemplo, Plan tranquilo"
          />
          <Field
            label="Comercializadora"
            value={tariff.provider}
            onChange={(v) => update("provider", v)}
            placeholder="Nombre de la compañía"
          />
        </div>
        <div className="form-section">
          <div className="section-inline">
            <h3>01 / Energía</h3>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={tariff.kind === "periods"}
                className={tariff.kind === "periods" ? "selected" : ""}
                onClick={() => update("kind", "periods")}
              >
                3 periodos
              </button>
              <button
                type="button"
                aria-pressed={tariff.kind === "fixed"}
                className={tariff.kind === "fixed" ? "selected" : ""}
                onClick={() => update("kind", "fixed")}
              >
                Precio único
              </button>
            </div>
          </div>
          <div className="form-grid three">
            {numeric(
              "energyPeak",
              tariff.kind === "fixed" ? "Precio las 24 horas" : "P1 · Punta",
              "€/kWh",
              true,
            )}
            {tariff.kind === "periods" && (
              <>
                {numeric("energyFlat", "P2 · Llano", "€/kWh", true)}
                {numeric("energyValley", "P3 · Valle", "€/kWh", true)}
              </>
            )}
          </div>
        </div>
        <div className="form-section">
          <div className="section-inline">
            <h3>02 / Potencia</h3>
            <label className="inline-label">
              Unidad
              <select
                value={tariff.powerUnit}
                onChange={(e) => update("powerUnit", e.target.value)}
              >
                <option value="day">€/kW/día</option>
                <option value="month">€/kW/mes</option>
                <option value="year">€/kW/año</option>
              </select>
            </label>
          </div>
          <label className="auth-label">
            Cómo aparece el precio de potencia
            <select
              value={tariff.powerKind}
              onChange={(e) => update("powerKind", e.target.value)}
            >
              <option value="periods">Dos precios: punta y valle</option>
              <option value="combined">
                Un precio total de potencia: se cobra una vez
              </option>
              <option value="same">
                El mismo precio por periodo: se cobra en punta y en valle
              </option>
            </select>
          </label>
          <div className="form-grid two">
            {numeric(
              "powerPeak",
              tariff.powerKind === "combined"
                ? "Precio total de potencia (P1 + P2)"
                : tariff.powerKind === "same"
                  ? "Precio de cada periodo"
                  : "P1 · Punta",
              powerUnitLabels[tariff.powerUnit],
              true,
            )}
            {tariff.powerKind === "periods" &&
              numeric(
                "powerValley",
                "P2 · Valle",
                powerUnitLabels[tariff.powerUnit],
                true,
              )}
          </div>
          <p className="small muted">
            {tariff.powerKind === "combined"
              ? "Multiplicamos el precio total por tus kW una sola vez. Requiere los mismos kW en ambos periodos; si son distintos, introduce los dos precios."
              : tariff.powerKind === "same"
                ? "Este precio se cobra dos veces: por los kW de punta y por los de valle. Si tu oferta indica un precio total de potencia, elige «Un precio total de potencia»."
                : "La tarifa 2.0TD tiene dos periodos de potencia, aunque tengas los mismos kW contratados."}
          </p>
          {tariff.powerUnit === "month" && (
            <p className="notice small">
              Potencia mensual: precio × kW × días ÷ 30. Si tu compañía
              prorratea de otra forma, puedes calcular el precio desde los
              importes de tu factura más abajo.
            </p>
          )}
        </div>
        <section className="form-section">
          <h3>03 / Alquiler, bono social y otros costes</h3>
          <p className="small muted">
            En blanco equivale a cero en estos cargos. Comprueba si están
            incluidos en el precio para no sumarlos dos veces.
          </p>
          <div className="form-grid two charge-fields">
            <div className="charge-field">
              {numeric("meterDay", "Alquiler de contador", "€/día")}
              <button
                type="button"
                className="link-button estimate-action"
                onClick={() =>
                  setTariff((t) => estimateMeter(t, "single-2013"))
                }
              >
                No lo sé · Usar estimación
              </button>
              {tariff.meterEstimate !== "none" && tariff.meterEstimate && (
                <label className="auth-label small">
                  Estimación aplicada · tipo de contador
                  <select
                    value={tariff.meterEstimate}
                    onChange={(e) => {
                      const kind = e.target.value;
                      if (kind === "single-2013" || kind === "three-2013")
                        setTariff((t) => estimateMeter(t, kind));
                    }}
                  >
                    {Object.entries(meterEstimates).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="small muted">
                La estimación inicial usa un contador inteligente monofásico.
                Puedes cambiar a trifásico. Si es tuyo, introduce 0.
                Prorrateamos el mes × 12 ÷ 365, sin impuestos.{" "}
                <a
                  className="text-link"
                  href={meterEstimateSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  Referencia regulada
                </a>
                .
              </p>
            </div>
            <div className="charge-field">
              {numeric("socialDay", "Financiación bono social", "€/día")}
              <button
                type="button"
                className="link-button estimate-action"
                onClick={() => setTariff(estimateSocial)}
              >
                No lo sé · Usar estimación
              </button>
              {tariff.socialEstimate === "ted634-2026" && (
                <p role="status" className="estimate-note small">
                  Estimación aplicada · referencia de junio de 2026.
                </p>
              )}
              <p className="small muted">
                Referencia de 2026: 9,011295 €/año ÷ 365, sin impuestos. En
                mercado libre depende del contrato: si ya está incluido,
                introduce 0 para no duplicarlo.{" "}
                <a
                  className="text-link"
                  href={socialEstimate2026.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  BOE · junio de 2026
                </a>
                .
              </p>
            </div>
          </div>
          <div className="form-grid two charge-fields">
            <div className="charge-field">
              {numeric("snoeeKwh", "Coste SNOEE (sin impuestos)", "€/kWh")}
              <p className="small muted">
                Solo si se cobra aparte y no está incluido en los precios de
                energía que has indicado. Si ya está incluido, déjalo vacío o a
                0.
              </p>
              <details className="small">
                <summary>¿Qué es el SNOEE?</summary>
                <p className="muted">
                  El Sistema Nacional de Obligaciones de Eficiencia Energética
                  (SNOEE) exige a las comercializadoras contribuir al ahorro de
                  energía. Algunas cobran este coste por separado. Es un coste
                  del suministro, no un impuesto; lo multiplicamos por tus kWh y
                  lo incluimos en las bases del IEE y del IVA.{" "}
                  <a
                    className="text-link"
                    href="https://www.miteco.gob.es/es/energia/eficiencia/sistema-nacional-obligaciones-efe.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    MITECO · Qué es el SNOEE
                  </a>
                  .
                </p>
              </details>
            </div>
            {numeric("servicesMonth", "Mantenimiento / servicios", "€/mes")}
          </div>
          <label className="checkbox small">
            <input
              type="checkbox"
              checked={tariff.socialInElectricityTax}
              onChange={(e) =>
                update("socialInElectricityTax", e.target.checked)
              }
            />{" "}
            Incluir financiación del bono social en la base del IEE
          </label>
          <p className="small muted">
            Es el criterio general. Desmárcalo solo si quieres reproducir una
            factura que lo excluye; el cargo seguirá sujeto a IVA.
          </p>
          <details className="form-section">
            <summary>Fechas, enlace y condiciones</summary>
            <div className="form-grid two">
              <Field
                label="Última revisión por ti"
                value={tariff.checkedOn}
                onChange={(v) => update("checkedOn", v)}
                type="date"
              />
              <Field
                label="Oferta válida hasta"
                value={tariff.validUntil}
                onChange={(v) => update("validUntil", v)}
                type="date"
              />
            </div>
            <Field
              label="Enlace de la oferta"
              value={tariff.url}
              onChange={(v) => update("url", v)}
              type="url"
              maxLength={2000}
              placeholder="https://…"
            />
            <label className="auth-label">
              Condiciones y notas
              <textarea
                maxLength={2000}
                value={tariff.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Permanencia, duración del descuento, servicios incluidos…"
              />
            </label>
          </details>
        </section>
        <section className="form-section">
          <h3>
            {invoiceDraft
              ? "04 / Tu factura de referencia"
              : "04 / Perfil compartido de consumo"}
          </h3>
          <p className="small muted">
            {invoiceDraft
              ? "Completa aquí lo que falte. Estos datos se guardarán solo en esta factura."
              : "Estos datos pertenecen a tu perfil compartido. Al cambiarlos aquí, cambiarán para todas las tarifas; no incluyen simulaciones sin adoptar."}
          </p>
          <ProfileFields value={profile} onChange={setProfile} />
          <TaxFields value={profile} onChange={setProfile} />
        </section>
        <InvoicePrices tariff={tariff} profile={profile} onApply={setTariff} />
        <section
          className="tariff-preview form-section"
          aria-label="Resultado de esta tarifa"
        >
          <h3>Así quedaría tu factura</h3>
          <EstimateNotice tariff={tariff} />
          {cost ? (
            <>
              <strong className="big-amount">{money(cost.total)}</strong>
              <p className="small muted">
                {profile.days} días ·{" "}
                {profile.taxes ? "Con impuestos" : "Sin impuestos"}
              </p>
              <dl className="bill-breakdown">
                {billLines.map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{money(cost[key])}</dd>
                  </div>
                ))}
              </dl>
              <p className="small muted">
                Base IEE: {money(cost.electricityBase)} · Base IVA:{" "}
                {money(cost.vatBase)}
              </p>
            </>
          ) : (
            <p className="notice">
              Completa los precios, el consumo, los kW y los días. Si incluyes
              impuestos, indica también sus porcentajes. El precio de potencia
              combinado requiere los mismos kW en ambos periodos.
            </p>
          )}
        </section>
        {isCurrent && (
          <div className="notice">
            <strong>
              Conservaremos los precios anteriores en tu historial.
            </strong>
            <Field
              label="Nuevos precios desde"
              type="date"
              value={since}
              onChange={setSince}
              required
            />
          </div>
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit">
            {duplicatedFrom ? "Crear tarifa" : "Aplicar tarifa"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
