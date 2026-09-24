"use client";
import { useState } from "react";
import { decimalComma, type Profile } from "@/lib/domain";
import { electricityTax, formatRate, generalVat } from "@/lib/regulated-rates";
import { Field } from "./ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const section = "mb-6";
const sectionTitle =
  "mb-3 flex justify-between text-sm-plus font-semibold max-[520px]:text-sm";
const grid = "grid gap-3.5 max-[1000px]:gap-2.5 max-[520px]:gap-3";
const three = "grid-cols-3 max-[800px]:grid-cols-2 max-[520px]:grid-cols-1";
const two = "grid-cols-2 max-[520px]:grid-cols-1";
const checkbox =
  "my-2 flex min-h-11 items-center gap-2 min-[801px]:text-sm-plus";
/* A dot in each energy period's colour before its label. */
const periodDots =
  "[&>*_label]:before:mr-1.5 [&>*_label]:before:inline-block [&>*_label]:before:size-[5px] [&>*_label]:before:rounded-full [&>*_label]:before:bg-period-1 [&>*:nth-child(2)_label]:before:bg-period-2 [&>*:nth-child(3)_label]:before:bg-period-3";

export function ProfileFields({
  value,
  onChange,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
}) {
  const [unlinked, setUnlinked] = useState(false);
  const samePower = !unlinked && value.peakKw === value.valleyKw;
  const field = (key: keyof Profile, label: string, unit: string) => (
    <Field
      key={key}
      label={label}
      unit={unit}
      decimal
      value={String(value[key])}
      onChange={(v) =>
        onChange({
          ...value,
          [key]: v,
          ...(samePower && key === "peakKw" ? { valleyKw: v } : {}),
        })
      }
    />
  );
  return (
    <>
      <div className={section}>
        <div className={sectionTitle}>Consumo de tu factura · kWh</div>
        <div className={cn(grid, three, periodDots, "items-end")}>
          {field("peakKwh", "Consumo P1 · Punta", "kWh")}
          {field("flatKwh", "Consumo P2 · Llano", "kWh")}
          {field("valleyKwh", "Consumo P3 · Valle", "kWh")}
        </div>
      </div>
      <div className={section}>
        <div className={sectionTitle}>Potencia contratada y duración</div>
        <label className={checkbox}>
          <Checkbox
            checked={samePower}
            onCheckedChange={(checked) => {
              setUnlinked(!checked === true);
              if (checked === true)
                onChange({ ...value, valleyKw: value.peakKw });
            }}
          />{" "}
          Tengo los mismos kW en punta y valle
        </label>
        <div className={cn(grid, samePower ? two : three)}>
          {field(
            "peakKw",
            samePower ? "Potencia en ambos períodos" : "Potencia P1 · Punta",
            "kW",
          )}
          {!samePower && field("valleyKw", "Potencia P2 · Valle", "kW")}
          {field("days", "Días del período", "días")}
        </div>
      </div>
    </>
  );
}

export function TaxFields({
  value,
  onChange,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className={checkbox}>
        <Checkbox
          checked={value.taxes}
          onCheckedChange={(checked) =>
            onChange({ ...value, taxes: checked === true })
          }
        />{" "}
        Incluir IVA e impuesto eléctrico
      </label>
      {value.taxes && (
        <>
          <div className={cn(grid, two)}>
            <Field
              label="IVA del suministro"
              value={value.vat}
              onChange={(vat) => onChange({ ...value, vat })}
              decimal
              unit="%"
            />
            <Field
              label="Impuesto eléctrico (IEE)"
              value={value.electricityTax}
              onChange={(electricityTax) =>
                onChange({ ...value, electricityTax })
              }
              decimal
              unit="%"
            />
          </div>
          <Button
            variant="link"
            size="inline"
            type="button"
            onClick={() =>
              onChange({
                ...value,
                vat: String(generalVat.percent),
                electricityTax: String(electricityTax.percent),
              })
            }
          >
            Usar tipos generales: {formatRate(generalVat.percent)} % y{" "}
            {formatRate(electricityTax.percent)} %
          </Button>
          <label className={cn(checkbox, "text-sm min-[801px]:text-sm")}>
            <Checkbox
              checked={value.minimumTax}
              onCheckedChange={(checked) =>
                onChange({ ...value, minimumTax: checked === true })
              }
            />{" "}
            Aplicar mínimo doméstico IEE (
            {formatRate(electricityTax.minimumPerKwh)} €/kWh)
          </label>
        </>
      )}
      <p className="m-0 text-sm-plus text-muted-foreground">
        Península y Baleares. Usa los tipos de tu factura: pueden variar según
        la fecha. Alquiler y bono social se indican en cada tarifa.
      </p>
    </div>
  );
}

export function TaxAssumptions({ profile }: { profile: Profile }) {
  return (
    <span aria-label="Impuestos de la comparación">
      {profile.taxes ? (
        <>
          IVA {decimalComma(profile.vat)} % · IEE{" "}
          {decimalComma(profile.electricityTax)} % ·{" "}
          {profile.minimumTax
            ? `Mínimo IEE ${formatRate(electricityTax.minimumPerKwh)} €/kWh`
            : "Mínimo IEE desactivado"}
        </>
      ) : (
        "Sin impuestos"
      )}
    </span>
  );
}
