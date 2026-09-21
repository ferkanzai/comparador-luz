"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  tariffSchema,
  today,
  money,
  type Profile,
  type Tariff,
} from "@/lib/domain";
import { Field, Modal } from "./ui";
import { ProfileFields, TaxFields } from "./profile-fields";
import InvoicePrices from "./invoice-prices";
import { calculate } from "@/lib/calculator";
import { billLines } from "@/lib/bill-data";
export default function TariffForm({
  initial,
  initialProfile,
  firstTariff,
  isCurrent,
  currentSince,
  onSave,
  onClose,
}: {
  initial: Tariff;
  initialProfile: Profile;
  firstTariff: boolean;
  isCurrent: boolean;
  currentSince: string;
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
    setTariff((t) => ({ ...t, [key]: value }));
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
      title={initial.name ? "Editar tarifa" : "Añadir una tarifa"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="modal-body">
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
              <option value="same">El mismo precio en cada periodo</option>
              <option value="combined">
                Un precio combinado: suma de punta y valle
              </option>
            </select>
          </label>
          <div className="form-grid two">
            {numeric(
              "powerPeak",
              tariff.powerKind === "combined"
                ? "Precio combinado P1 + P2"
                : tariff.powerKind === "same"
                  ? "Precio de cada periodo"
                  : "P1 · Punta",
              tariff.powerUnit === "day" ? "€/kW/día" : "€/kW/año",
              true,
            )}
            {tariff.powerKind === "periods" &&
              numeric(
                "powerValley",
                "P2 · Valle",
                tariff.powerUnit === "day" ? "€/kW/día" : "€/kW/año",
                true,
              )}
          </div>
          <p className="small muted">
            {tariff.powerKind === "combined"
              ? "La suma se cobra una vez y requiere los mismos kW en ambos periodos. Si tus potencias son distintas, introduce los dos precios."
              : tariff.powerKind === "same"
                ? "Se aplica este precio a los kW de punta y a los de valle, y se suman ambos importes."
                : "La tarifa 2.0TD tiene dos periodos de potencia, aunque tengas los mismos kW contratados."}
          </p>
        </div>
        <section className="form-section">
          <h3>03 / Alquiler, bono social y otros costes</h3>
          <p className="small muted">
            En blanco equivale a cero en estos cargos. Comprueba si están
            incluidos en el precio para no sumarlos dos veces.
          </p>
          <div className="form-grid three">
            {numeric("meterDay", "Alquiler de contador", "€/día")}
            {numeric("socialDay", "Financiación bono social", "€/día")}
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
                label="Oferta revisada el"
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
          <h3>04 / Tu factura de referencia</h3>
          <p className="small muted">
            Completa aquí lo que falte. Estos datos se usarán para comparar
            todas las tarifas.
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
            Aplicar tarifa
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
