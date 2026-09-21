"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { tariffSchema, today, type Tariff } from "@/lib/domain";
import { Field, Modal } from "./ui";
export default function TariffForm({
  initial,
  isCurrent,
  currentSince,
  onSave,
  onClose,
}: {
  initial: Tariff;
  isCurrent: boolean;
  currentSince: string;
  onSave: (t: Tariff, since: string) => void;
  onClose: () => void;
}) {
  const [tariff, setTariff] = useState(initial);
  const [since, setSince] = useState(today());
  const [error, setError] = useState("");
  const update = (key: keyof Tariff, value: string) =>
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
    onSave(result.data, since);
  }
  return (
    <Modal
      title={initial.name ? "Editar tarifa" : "Añadir una tarifa"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="modal-body">
        <p className="muted">
          Copia los precios <strong>sin impuestos</strong> de tu factura u
          oferta. Usa 0 cuando un término no tenga coste.
        </p>
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
          <div className="form-grid two">
            {numeric(
              "powerPeak",
              "P1 · Punta",
              tariff.powerUnit === "day" ? "€/kW/día" : "€/kW/año",
              true,
            )}
            {numeric(
              "powerValley",
              "P2 · Valle",
              tariff.powerUnit === "day" ? "€/kW/día" : "€/kW/año",
              true,
            )}
          </div>
        </div>
        <details className="form-section" open={undefined}>
          <summary>
            03 / Otros costes y condiciones <span>Opcional</span>
          </summary>
          <p className="small muted">
            En blanco equivale a cero en estos cargos. Comprueba si están
            incluidos en el precio para no sumarlos dos veces.
          </p>
          <div className="form-grid three">
            {numeric("meterDay", "Alquiler de contador", "€/día")}
            {numeric("socialDay", "Financiación bono social", "€/día")}
            {numeric("servicesMonth", "Mantenimiento / servicios", "€/mes")}
          </div>
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
