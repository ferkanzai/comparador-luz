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
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { textLink } from "./comparison-table";

/* Layouts shared by the tariff form and its sections. */
const formGrid = "grid gap-3.5 max-[1000px]:gap-2.5 max-[520px]:gap-3";
export const two = cn(formGrid, "grid-cols-2 max-[520px]:grid-cols-1");
const three = cn(
  formGrid,
  "grid-cols-3 max-[800px]:grid-cols-2 max-[520px]:grid-cols-1",
);
export const formSection = "mt-5 border-t border-border pt-5";
export const sectionTitle =
  "m-0 font-heading text-sm-plus font-bold tracking-[-0.25px]";
/* A note under a section title or its fields. */
export const sectionNote = "m-0 mt-2.5 mb-5 text-sm-plus text-muted-foreground";
export const checkboxLabel =
  "my-2 flex min-h-11 items-center gap-2 min-[801px]:text-sm-plus";
const selectLabel = "my-4 block text-sm-plus font-medium";
/* 44px selects, as the other controls. */
const tallSelect = "*:[select]:min-h-11";
const sectionHeading =
  "mb-3.5 flex items-center justify-between gap-3 max-[520px]:flex-wrap max-[520px]:gap-2.5";
/* A section folded under its summary. */
export const formDisclosure = cn(
  formSection,
  "[&>summary]:min-h-11 [&>summary]:cursor-pointer [&>summary]:content-center [&>summary]:text-sm-plus [&>summary]:font-semibold",
);
const chargeField = "min-w-0 rounded-lg border border-border bg-background p-4";
const chargeNote = "m-0 mt-2.5 text-sm-plus text-muted-foreground";

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
    <section className={formSection}>
      <div className={two}>
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
          <label className={checkboxLabel}>
            <Checkbox
              checked={dates.moveBoundary ?? false}
              onCheckedChange={(checked) =>
                onChange({ ...dates, moveBoundary: checked === true })
              }
            />
            Ajustar también los períodos contiguos
          </label>
          <p className={sectionNote}>
            Corregimos este período sin registrar un cambio de precios. Las
            facturas guardadas conservan su propia copia: corrígelas en Mis
            facturas si lo necesitas.
          </p>
        </>
      )}
      {preview?.(dates)}
      <p className={sectionNote}>
        La fecha de fin marca el cambio: si la siguiente tarifa empieza el 1 de
        junio, la anterior termina en esa misma fecha. Ese día pertenece a la
        nueva tarifa.
      </p>
    </section>
  );
}

export function EnergySection({ tariff, update }: SectionProps) {
  return (
    <div className={formSection}>
      <div className={sectionHeading}>
        <h3 className={sectionTitle}>01 / Energía</h3>
        <ToggleGroup
          type="single"
          value={tariff.kind}
          className="rounded-lg bg-muted p-1 *:data-[state=on]:bg-card *:data-[state=on]:shadow-sm"
        >
          <ToggleGroupItem
            value="periods"
            onClick={() => update("kind", "periods")}
          >
            3 períodos
          </ToggleGroupItem>
          <ToggleGroupItem
            value="fixed"
            onClick={() => update("kind", "fixed")}
          >
            Precio único
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className={three}>
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
    <div className={formSection}>
      <div className={sectionHeading}>
        <h3 className={sectionTitle}>02 / Potencia</h3>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Unidad
          <NativeSelect
            className={cn(tallSelect, "*:[select]:text-foreground")}
            value={tariff.powerUnit}
            onChange={(e) => update("powerUnit", e.target.value)}
          >
            <NativeSelectOption value="day">€/kW/día</NativeSelectOption>
            <NativeSelectOption value="month">€/kW/mes</NativeSelectOption>
            <NativeSelectOption value="year">€/kW/año</NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
      <label className={selectLabel}>
        Cómo aparece el precio de potencia
        <NativeSelect
          className={tallSelect}
          value={tariff.powerKind}
          onChange={(e) => update("powerKind", e.target.value)}
        >
          <NativeSelectOption value="periods">
            Dos precios: punta y valle
          </NativeSelectOption>
          <NativeSelectOption value="combined">
            Un precio total de potencia: se cobra una vez
          </NativeSelectOption>
          <NativeSelectOption value="same">
            El mismo precio por período: se cobra en punta y en valle
          </NativeSelectOption>
        </NativeSelect>
      </label>
      <div className={two}>
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
      <p className={sectionNote}>
        {tariff.powerKind === "combined"
          ? "Multiplicamos el precio total por tus kW una sola vez. Requiere los mismos kW en ambos períodos; si son distintos, introduce los dos precios."
          : tariff.powerKind === "same"
            ? "Este precio se cobra dos veces: por los kW de punta y por los de valle. Si tu oferta indica un precio total de potencia, elige «Un precio total de potencia»."
            : "La tarifa 2.0TD tiene dos períodos de potencia, aunque tengas los mismos kW contratados."}
      </p>
      {tariff.powerUnit === "month" && (
        <Alert role="note">
          Potencia mensual: precio × kW × días ÷ 30. Si tu compañía prorratea de
          otra forma, puedes calcular el precio desde los importes de tu factura
          más abajo.
        </Alert>
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
    <section className={formSection}>
      <h3 className={sectionTitle}>
        03 / Alquiler, bono social y otros costes
      </h3>
      <p className={sectionNote}>
        En blanco equivale a cero en estos cargos. Comprueba si están incluidos
        en el precio para no sumarlos dos veces.
      </p>
      <div className={cn(two, "my-5 items-start")}>
        <div className={chargeField}>
          <PriceField
            tariff={tariff}
            update={update}
            name="meterDay"
            label="Alquiler de contador"
            unit="€/día"
          />
          <Button
            variant="link"
            size="inline"
            className="min-h-11 text-left"
            type="button"
            onClick={() => onEstimate((t) => estimateMeter(t, "single-2013"))}
          >
            No lo sé · Usar estimación
          </Button>
          {tariff.meterEstimate !== "none" && tariff.meterEstimate && (
            <label className={selectLabel}>
              Estimación aplicada · tipo de contador
              <NativeSelect
                className={tallSelect}
                value={tariff.meterEstimate}
                onChange={(e) => {
                  const kind = e.target.value;
                  if (kind === "single-2013" || kind === "three-2013")
                    onEstimate((t) => estimateMeter(t, kind));
                }}
              >
                {(["single-2013", "three-2013"] as const).map((kind) => (
                  <NativeSelectOption key={kind} value={kind}>
                    {meterRentalLabel(kind)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          )}
          <p className={chargeNote}>
            La estimación inicial usa un contador inteligente monofásico. Puedes
            cambiar a trifásico. Si es tuyo, introduce 0. Prorrateamos el mes ×
            12 ÷ 365, sin impuestos.{" "}
            <a
              className={textLink}
              href={meterRentalSource}
              target="_blank"
              rel="noreferrer"
            >
              Referencia regulada
            </a>
            .
          </p>
        </div>
        <div className={chargeField}>
          <PriceField
            tariff={tariff}
            update={update}
            name="socialDay"
            label="Financiación bono social"
            unit="€/día"
          />
          <Button
            variant="link"
            size="inline"
            className="min-h-11 text-left"
            type="button"
            onClick={() => onEstimate(estimateSocial)}
          >
            No lo sé · Usar estimación
          </Button>
          {tariff.socialEstimate === "ted634-2026" && (
            <p
              role="status"
              className={cn(
                chargeNote,
                "rounded-md bg-success-muted px-3 py-2.5",
              )}
            >
              Estimación aplicada · referencia de junio de 2026.
            </p>
          )}
          <p className={chargeNote}>
            Referencia de 2026: {formatRate(socialFinancing2026.annual)} €/año ÷
            365, sin impuestos. En mercado libre depende del contrato: si ya
            está incluido, introduce 0 para no duplicarlo.{" "}
            <a
              className={textLink}
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
      <div className={cn(two, "my-5 items-start")}>
        <div className={chargeField}>
          <PriceField
            tariff={tariff}
            update={update}
            name="snoeeKwh"
            label="Coste SNOEE (sin impuestos)"
            unit="€/kWh"
          />
          <p className={chargeNote}>
            Solo si se cobra aparte y no está incluido en los precios de energía
            que has indicado. Si ya está incluido, déjalo vacío o a 0.
          </p>
          <details className="text-sm-plus">
            <summary className="min-h-11 cursor-pointer content-center">
              ¿Qué es el SNOEE?
            </summary>
            <p className="m-0 text-muted-foreground">
              El Sistema Nacional de Obligaciones de Eficiencia Energética
              (SNOEE) exige a las comercializadoras contribuir al ahorro de
              energía. Algunas cobran este coste por separado. Es un coste del
              suministro, no un impuesto; lo multiplicamos por tus kWh y lo
              incluimos en las bases del IEE y del IVA.{" "}
              <a
                className={textLink}
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
      <label className={cn(checkboxLabel, "text-sm min-[801px]:text-sm")}>
        <Checkbox
          checked={tariff.socialInElectricityTax}
          onCheckedChange={(checked) =>
            update("socialInElectricityTax", checked === true)
          }
        />{" "}
        Incluir financiación del bono social en la base del IEE
      </label>
      <p className={sectionNote}>
        Es el criterio general. Desmárcalo solo si quieres reproducir una
        factura que lo excluye; el cargo seguirá sujeto a IVA.
      </p>
      {children}
    </section>
  );
}

export function OfferValiditySection({ tariff, update }: SectionProps) {
  return (
    <details className={formDisclosure}>
      <summary>Validez y condiciones</summary>
      <div className={cn(two, "my-4")}>
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
        className="mb-4"
      />
      <label className={selectLabel}>
        Condiciones y notas
        <Textarea
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
      className={cn(formSection, "rounded-lg bg-accent p-6 max-[520px]:p-4")}
      aria-label="Resultado de esta tarifa"
    >
      <h3 className={sectionTitle}>Así quedaría tu factura</h3>
      <EstimateNotice tariff={tariff} />
      {cost ? (
        <>
          <strong className="my-px font-heading text-4xl/[inherit] font-semibold tracking-[-1.5px] max-[520px]:text-3xl/[inherit]">
            {money(cost.total)}
          </strong>
          <p className={sectionNote}>
            {profile.days} días ·{" "}
            {profile.taxes ? "Con impuestos" : "Sin impuestos"}
          </p>
          <dl className="my-4">
            {estimateLines([cost]).map(([key, label]) => (
              <div key={key} className="my-2 flex justify-between gap-4">
                <dt>{label}</dt>
                <dd className="m-0 whitespace-nowrap tabular-nums">
                  {money(cost[key])}
                </dd>
              </div>
            ))}
          </dl>
          <p className={sectionNote}>
            Base IEE: {money(cost.electricityBase)} · Base IVA:{" "}
            {money(cost.vatBase)}
          </p>
        </>
      ) : (
        <Alert role="note">
          Completa los precios, el consumo, los kW y los días. Si incluyes
          impuestos, indica también sus porcentajes. El precio de potencia
          combinado requiere los mismos kW en ambos períodos.
        </Alert>
      )}
    </section>
  );
}
