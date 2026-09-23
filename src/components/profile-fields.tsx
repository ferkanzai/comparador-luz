"use client";
import { useState } from "react";
import { decimalComma, type Profile } from "@/lib/domain";
import {
  electricityTax,
  formatRate,
  generalVat,
} from "@/lib/regulated-rates";
import { Field } from "./ui";

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
      <div className="input-section">
        <div className="input-section-title">Consumo de tu factura · kWh</div>
        <div className="form-grid three energy-inputs">
          {field("peakKwh", "Consumo P1 · Punta", "kWh")}
          {field("flatKwh", "Consumo P2 · Llano", "kWh")}
          {field("valleyKwh", "Consumo P3 · Valle", "kWh")}
        </div>
      </div>
      <div className="input-section">
        <div className="input-section-title">
          Potencia contratada y duración
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={samePower}
            onChange={(e) => {
              setUnlinked(!e.target.checked);
              if (e.target.checked)
                onChange({ ...value, valleyKw: value.peakKw });
            }}
          />{" "}
          Tengo los mismos kW en punta y valle
        </label>
        <div className={`form-grid ${samePower ? "two" : "three"}`}>
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
    <div className="tax-fields">
      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.taxes}
          onChange={(e) => onChange({ ...value, taxes: e.target.checked })}
        />{" "}
        Incluir IVA e impuesto eléctrico
      </label>
      {value.taxes && (
        <>
          <div className="form-grid two">
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
          <button
            type="button"
            className="link-button"
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
          </button>
          <label className="checkbox small">
            <input
              type="checkbox"
              checked={value.minimumTax}
              onChange={(e) =>
                onChange({ ...value, minimumTax: e.target.checked })
              }
            />{" "}
            Aplicar mínimo doméstico IEE (
            {formatRate(electricityTax.minimumPerKwh)} €/kWh)
          </label>
        </>
      )}
      <p className="small muted">
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
