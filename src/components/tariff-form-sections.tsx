import type { ReactNode } from "react";
import {
  money,
  powerUnitLabels,
  type Profile,
  type Tariff,
} from "@/lib/domain";
import { calculate } from "@/lib/calculator";
import { estimateLines } from "@/lib/bill-data";
import { estimateMeter, estimateSocial } from "@/lib/charge-estimates";
import {
  formatRate,
  meterRentalLabel,
  meterRentalSource,
  socialFinancing2026,
} from "@/lib/regulated-rates";
import type { PeriodCorrection } from "@/lib/tariff-periods";
import { Field } from "./ui";
import EstimateNotice from "./estimate-notice";

export type TariffUpdate = (key: keyof Tariff, value: string | boolean) => void;
type SectionProps = { tariff: Tariff; update: TariffUpdate };

function PriceField({
  tariff,
  update,
  name,
  label,
  unit,
  required = false,
}: SectionProps & {
  name: keyof Tariff;
  label: string;
  unit: string;
  required?: boolean;
}) {
  return (
    <Field
      label={label}
      value={String(tariff[name])}
      onChange={(v) => update(name, v)}
      unit={unit}
      decimal
      required={required}
    />
  );
}

export function PeriodDatesSection({
  dates,
  onChange,
  hasEnd,
  preview,
}: {
  dates: PeriodCorrection;
  onChange: (dates: PeriodCorrection) => void;
  hasEnd: boolean;
  preview?: (dates: PeriodCorrection) => ReactNode;
}) {
  return (
    <section className="form-section">
      <div className="form-grid two">
        <Field
          label="Fecha de inicio"
          type="date"
          value={dates.start}
          onChange={(start) => onChange({ ...dates, start })}
          required
        />
        {hasEnd && (
          <Field
            label="Fecha de fin"
            type="date"
            value={dates.end}
            onChange={(end) => onChange({ ...dates, end })}
            required
          />
        )}
      </div>
      {preview && (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={dates.moveBoundary ?? false}
              onChange={(e) =>
                onChange({ ...dates, moveBoundary: e.target.checked })
              }
            />
            Ajustar también los períodos contiguos
          </label>
          <p className="small muted">
            Corregimos este período sin registrar un cambio de precios. Las
            facturas guardadas conservan su propia copia: corrígelas en Mis
            facturas si lo necesitas.
          </p>
        </>
      )}
      {preview?.(dates)}
      <p className="small muted">
        La fecha de fin marca el cambio: si la siguiente tarifa empieza el 1 de
        junio, la anterior termina en esa misma fecha. Ese día pertenece a la
        nueva tarifa.
      </p>
    </section>
  );
}

export function EnergySection({ tariff, update }: SectionProps) {
  return (
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
            3 períodos
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
        <PriceField
          tariff={tariff}
          update={update}
          name="energyPeak"
          label={tariff.kind === "fixed" ? "Precio las 24 horas" : "P1 · Punta"}
          unit="€/kWh"
          required
        />
        {tariff.kind === "periods" && (
          <>
            <PriceField
              tariff={tariff}
              update={update}
              name="energyFlat"
              label="P2 · Llano"
              unit="€/kWh"
              required
            />
            <PriceField
              tariff={tariff}
              update={update}
              name="energyValley"
              label="P3 · Valle"
              unit="€/kWh"
              required
            />
          </>
        )}
      </div>
    </div>
  );
}

export function PowerSection({ tariff, update }: SectionProps) {
  const unit = powerUnitLabels[tariff.powerUnit];
  return (
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
            El mismo precio por período: se cobra en punta y en valle
          </option>
        </select>
      </label>
      <div className="form-grid two">
        <PriceField
          tariff={tariff}
          update={update}
          name="powerPeak"
          label={
            tariff.powerKind === "combined"
              ? "Precio total de potencia (P1 + P2)"
              : tariff.powerKind === "same"
                ? "Precio de cada período"
                : "P1 · Punta"
          }
          unit={unit}
          required
        />
        {tariff.powerKind === "periods" && (
          <PriceField
            tariff={tariff}
            update={update}
            name="powerValley"
            label="P2 · Valle"
            unit={unit}
            required
          />
        )}
      </div>
      <p className="small muted">
        {tariff.powerKind === "combined"
          ? "Multiplicamos el precio total por tus kW una sola vez. Requiere los mismos kW en ambos períodos; si son distintos, introduce los dos precios."
          : tariff.powerKind === "same"
            ? "Este precio se cobra dos veces: por los kW de punta y por los de valle. Si tu oferta indica un precio total de potencia, elige «Un precio total de potencia»."
            : "La tarifa 2.0TD tiene dos períodos de potencia, aunque tengas los mismos kW contratados."}
      </p>
      {tariff.powerUnit === "month" && (
        <p className="notice small">
          Potencia mensual: precio × kW × días ÷ 30. Si tu compañía prorratea de
          otra forma, puedes calcular el precio desde los importes de tu factura
          más abajo.
        </p>
      )}
    </div>
  );
}

export function ChargesSection({
  tariff,
  update,
  onEstimate,
  children,
}: SectionProps & {
  onEstimate: (estimate: (tariff: Tariff) => Tariff) => void;
  children: ReactNode;
}) {
  return (
    <section className="form-section">
      <h3>03 / Alquiler, bono social y otros costes</h3>
      <p className="small muted">
        En blanco equivale a cero en estos cargos. Comprueba si están incluidos
        en el precio para no sumarlos dos veces.
      </p>
      <div className="form-grid two charge-fields">
        <div className="charge-field">
          <PriceField
            tariff={tariff}
            update={update}
            name="meterDay"
            label="Alquiler de contador"
            unit="€/día"
          />
          <button
            type="button"
            className="link-button estimate-action"
            onClick={() => onEstimate((t) => estimateMeter(t, "single-2013"))}
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
                    onEstimate((t) => estimateMeter(t, kind));
                }}
              >
                {(["single-2013", "three-2013"] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {meterRentalLabel(kind)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="small muted">
            La estimación inicial usa un contador inteligente monofásico. Puedes
            cambiar a trifásico. Si es tuyo, introduce 0. Prorrateamos el mes ×
            12 ÷ 365, sin impuestos.{" "}
            <a
              className="text-link"
              href={meterRentalSource}
              target="_blank"
              rel="noreferrer"
            >
              Referencia regulada
            </a>
            .
          </p>
        </div>
        <div className="charge-field">
          <PriceField
            tariff={tariff}
            update={update}
            name="socialDay"
            label="Financiación bono social"
            unit="€/día"
          />
          <button
            type="button"
            className="link-button estimate-action"
            onClick={() => onEstimate(estimateSocial)}
          >
            No lo sé · Usar estimación
          </button>
          {tariff.socialEstimate === "ted634-2026" && (
            <p role="status" className="estimate-note small">
              Estimación aplicada · referencia de junio de 2026.
            </p>
          )}
          <p className="small muted">
            Referencia de 2026: {formatRate(socialFinancing2026.annual)} €/año ÷
            365, sin impuestos. En mercado libre depende del contrato: si ya
            está incluido, introduce 0 para no duplicarlo.{" "}
            <a
              className="text-link"
              href={socialFinancing2026.source}
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
          <PriceField
            tariff={tariff}
            update={update}
            name="snoeeKwh"
            label="Coste SNOEE (sin impuestos)"
            unit="€/kWh"
          />
          <p className="small muted">
            Solo si se cobra aparte y no está incluido en los precios de energía
            que has indicado. Si ya está incluido, déjalo vacío o a 0.
          </p>
          <details className="small">
            <summary>¿Qué es el SNOEE?</summary>
            <p className="muted">
              El Sistema Nacional de Obligaciones de Eficiencia Energética
              (SNOEE) exige a las comercializadoras contribuir al ahorro de
              energía. Algunas cobran este coste por separado. Es un coste del
              suministro, no un impuesto; lo multiplicamos por tus kWh y lo
              incluimos en las bases del IEE y del IVA.{" "}
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
        <PriceField
          tariff={tariff}
          update={update}
          name="servicesMonth"
          label="Mantenimiento / servicios"
          unit="€/mes"
        />
      </div>
      <label className="checkbox small">
        <input
          type="checkbox"
          checked={tariff.socialInElectricityTax}
          onChange={(e) => update("socialInElectricityTax", e.target.checked)}
        />{" "}
        Incluir financiación del bono social en la base del IEE
      </label>
      <p className="small muted">
        Es el criterio general. Desmárcalo solo si quieres reproducir una
        factura que lo excluye; el cargo seguirá sujeto a IVA.
      </p>
      {children}
    </section>
  );
}

export function OfferValiditySection({ tariff, update }: SectionProps) {
  return (
    <details className="form-section">
      <summary>Validez y condiciones</summary>
      <div className="form-grid two">
        <Field
          label="Oferta válida hasta"
          hint="Si la oferta tiene una fecha límite para contratarla, indícala aquí. No es la fecha de fin de tu contrato."
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
  );
}

export function TariffPreview({
  tariff,
  profile,
}: {
  tariff: Tariff;
  profile: Profile;
}) {
  const cost = calculate(tariff, profile);
  return (
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
            {estimateLines([cost]).map(([key, label]) => (
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
          combinado requiere los mismos kW en ambos períodos.
        </p>
      )}
    </section>
  );
}
