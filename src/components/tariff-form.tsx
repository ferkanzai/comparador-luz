"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Copy } from "lucide-react";
import { tariffSchema, type Profile, type Tariff } from "@/lib/domain";
import type { PeriodCorrection } from "@/lib/tariff-periods";
import type { SaveTariffOptions } from "@/lib/workspace-actions";
import { Field, Modal } from "./ui";
import { ProfileFields, TaxFields } from "./profile-fields";
import InvoicePrices from "./invoice-prices";
import {
  ChargesSection,
  EnergySection,
  OfferValiditySection,
  PeriodDatesSection,
  PowerSection,
  TariffPreview,
  type TariffUpdate,
} from "./tariff-form-sections";

export type TariffFormMode =
  | {
      /** A tariff in the comparison: new, edited or duplicated. */
      kind: "offer";
      first: boolean;
      duplicatedFrom?: string;
      onSave: (tariff: Tariff, options: SaveTariffOptions) => void;
    }
  | {
      /** A dated period in the tariff history. */
      kind: "record";
      title: string;
      start: string;
      /** Omitted for the current period, which has no end date. */
      end?: string;
      /** Only for corrections, which can also move the neighbouring periods. */
      preview?: (dates: PeriodCorrection) => ReactNode;
      onSave: (tariff: Tariff, dates: PeriodCorrection) => void;
    }
  | {
      /** A tariff created from a bill's prices, with that bill's consumption. */
      kind: "invoice";
      onSave: (tariff: Tariff, profile: Profile) => void;
    };

function unhandled(mode: never): never {
  throw new Error(`Unhandled tariff form mode: ${JSON.stringify(mode)}`);
}

function title(mode: TariffFormMode, initial: Tariff) {
  switch (mode.kind) {
    case "offer":
      if (mode.duplicatedFrom) return "Duplicar tarifa";
      return initial.name ? "Editar tarifa" : "Añadir una tarifa";
    case "record":
      return mode.title;
    case "invoice":
      return "Añadir una tarifa";
    default:
      return unhandled(mode);
  }
}

function submitLabel(mode: TariffFormMode) {
  switch (mode.kind) {
    case "offer":
      return mode.duplicatedFrom ? "Crear tarifa" : "Aplicar tarifa";
    case "record":
      return "Guardar período";
    case "invoice":
      return "Aplicar tarifa";
    default:
      return unhandled(mode);
  }
}

export default function TariffForm({
  mode,
  initial,
  initialProfile,
  onClose,
}: {
  mode: TariffFormMode;
  initial: Tariff;
  initialProfile: Profile;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [tariff, setTariff] = useState(initial);
  const [makeCurrent, setMakeCurrent] = useState(
    mode.kind === "offer" && mode.first,
  );
  const [since, setSince] = useState("");
  const [dates, setDates] = useState<PeriodCorrection>(
    mode.kind === "record"
      ? { start: mode.start, end: mode.end ?? "", moveBoundary: false }
      : { start: "", end: "" },
  );
  const [error, setError] = useState("");
  const update: TariffUpdate = (key, value) =>
    setTariff((t) => ({
      ...t,
      [key]: value,
      ...(key === "meterDay" ? { meterEstimate: "none" as const } : {}),
      ...(key === "socialDay" ? { socialEstimate: "none" as const } : {}),
    }));
  function save(saved: Tariff) {
    switch (mode.kind) {
      case "offer":
        return mode.onSave(saved, { since, profile, makeCurrent });
      case "record":
        return mode.onSave(saved, dates);
      case "invoice":
        return mode.onSave(saved, profile);
      default:
        return unhandled(mode);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = tariffSchema.safeParse(tariff);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    try {
      save(result.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Revisa los datos.");
    }
  }
  const first = mode.kind === "offer" && mode.first;
  return (
    <Modal title={title(mode, initial)} onClose={onClose} wide>
      <form onSubmit={submit} className="modal-body">
        {mode.kind === "offer" && mode.duplicatedFrom && (
          <div className="tariff-copy-notice">
            <Copy size={20} aria-hidden="true" />
            <div>
              <strong>A partir de {mode.duplicatedFrom}</strong>
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
        {mode.kind === "record" && (
          <PeriodDatesSection
            dates={dates}
            onChange={setDates}
            hasEnd={mode.end !== undefined}
            preview={mode.preview}
          />
        )}
        {first && (
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
        <EnergySection tariff={tariff} update={update} />
        <PowerSection tariff={tariff} update={update} />
        <ChargesSection tariff={tariff} update={update} onEstimate={setTariff}>
          <OfferValiditySection tariff={tariff} update={update} />
        </ChargesSection>
        {mode.kind !== "record" && (
          <>
            <section className="form-section">
              <h3>
                {mode.kind === "invoice"
                  ? "04 / Tu factura de referencia"
                  : "04 / Perfil compartido de consumo"}
              </h3>
              <p className="small muted">
                {mode.kind === "invoice"
                  ? "Completa aquí lo que falte. Estos datos se guardarán solo en esta factura."
                  : "Estos datos pertenecen a tu perfil compartido. Al cambiarlos aquí, cambiarán para todas las tarifas; no incluyen simulaciones sin adoptar."}
              </p>
              <ProfileFields value={profile} onChange={setProfile} />
              <TaxFields value={profile} onChange={setProfile} />
            </section>
            <InvoicePrices
              tariff={tariff}
              profile={profile}
              onApply={setTariff}
            />
            <TariffPreview tariff={tariff} profile={profile} />
          </>
        )}
        {first && makeCurrent && (
          <Field
            label="Fecha de inicio"
            type="date"
            value={since}
            onChange={setSince}
            required
            hint="Fecha en la que empezaron estas condiciones de tu contrato actual."
          />
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
            {submitLabel(mode)}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
