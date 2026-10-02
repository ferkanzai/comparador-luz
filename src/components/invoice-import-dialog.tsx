"use client";
import { useState, type FormEvent } from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import {
  billSchema,
  decimalComma,
  money,
  powerDescription,
  shortDate,
  type Bill,
  type Tariff,
  type Profile,
  type Workspace,
} from "@/lib/domain";
import { parseInvoiceQr } from "@/lib/invoice-qr";
import {
  duplicateBill,
  planInvoiceImport,
  type InvoiceImport,
} from "@/lib/invoice-import";
import {
  roleStartsContract,
  type InvoiceImportChoices,
  type TariffRole,
} from "@/lib/workspace-actions";
import { commands, type WorkspaceCommand } from "@/lib/workspace-commands";
import { formatKwh } from "@/lib/bill-consumption";
import { Field, Modal } from "./ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  checkboxLabel,
  formSection,
  sectionNote,
  sectionTitle,
  selectLabel,
  tallSelect,
  two,
} from "./tariff-form-sections";

const roleLabels: Record<TariffRole, string> = {
  current: "Es mi tarifa actual",
  "matches-current": "Es mi tarifa actual (ya registrada)",
  "price-change": "Mi tarifa actual ha cambiado de precios",
  offer: "Guardarla como oferta para comparar",
};

export default function InvoiceImportDialog({
  workspace: w,
  run,
  onClose,
  onImported,
  canRecordBills = true,
}: {
  workspace: Workspace;
  /** Guests keep no bills, so their import skips the bill. */
  canRecordBills?: boolean;
  run: (command: WorkspaceCommand) => void;
  onClose: () => void;
  onImported?: (bill: Bill | null) => void;
}) {
  const [plan, setPlan] = useState<InvoiceImport | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function read(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError("");
    try {
      // Loaded on demand: the PDF and QR libraries only download when used.
      const { decodeInvoiceQr } = await import("@/lib/decode-invoice-qr");
      setPlan(
        planInvoiceImport(parseInvoiceQr(await decodeInvoiceQr(file)), w),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo leer la factura. Inténtalo de nuevo.",
      );
    } finally {
      setReading(false);
    }
  }

  return (
    <Modal title="Importar factura" onClose={onClose} size="wide">
      {plan ? (
        <Review
          plan={plan}
          workspace={w}
          canRecordBills={canRecordBills}
          onCancel={onClose}
          onSave={(choices) => {
            run(commands.importInvoice(choices));
            onImported?.(choices.bill);
            onClose();
          }}
        />
      ) : (
        <div className="p-6 max-[520px]:p-5">
          <p className="m-0 mb-4 text-muted-foreground">
            Sube el PDF de tu factura de luz o una foto o captura de su código
            QR. Con él rellenamos la factura, tu perfil de consumo y tu tarifa;
            podrás revisarlo todo antes de guardar.
          </p>
          <Alert className="mb-5" role="note">
            <ShieldCheck />
            <p className="m-0">
              Tu factura se lee en este dispositivo: no la guardamos ni la
              enviamos a ningún servidor. Del código QR solo conservamos lo que
              decidas guardar, nunca tu CUPS ni tu dirección.
            </p>
          </Alert>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center has-focus-visible:ring-2 has-focus-visible:ring-ring",
              dragging && "border-primary bg-accent",
              reading && "pointer-events-none opacity-70",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              // Leaving for a child still counts as inside the drop zone.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void read(e.dataTransfer.files[0]);
            }}
          >
            <FileUp aria-hidden />
            <span className="font-semibold">
              {reading
                ? "Leyendo la factura…"
                : dragging
                  ? "Suelta aquí tu factura"
                  : "Elegir PDF o imagen"}
            </span>
            {/* Hidden, not removed, so the drop zone keeps its size. */}
            <span
              className={cn(
                "text-sm text-muted-foreground pointer-coarse:hidden",
                (reading || dragging) && "invisible",
              )}
            >
              o arrástralo aquí
            </span>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              disabled={reading}
              onChange={(e) => {
                void read(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {error && (
            <Alert variant="destructive" role="alert" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
}

function Review({
  plan,
  workspace: w,
  canRecordBills,
  onCancel,
  onSave,
}: {
  plan: InvoiceImport;
  workspace: Workspace;
  canRecordBills: boolean;
  onCancel: () => void;
  onSave: (choices: InvoiceImportChoices) => void;
}) {
  const [recordBill, setRecordBill] = useState(canRecordBills);
  const [updateProfile, setUpdateProfile] = useState(true);
  const [saveTariff, setSaveTariff] = useState(!!plan.tariff);
  const [month, setMonth] = useState(plan.bill.month);
  const [provider, setProvider] = useState(plan.bill.provider);
  const [name, setName] = useState(plan.tariff?.name ?? "");
  const [role, setRole] = useState<TariffRole>(plan.role ?? "offer");
  const [since, setSince] = useState("");
  const [effective, setEffective] = useState(false);
  const [error, setError] = useState("");
  const roles: TariffRole[] =
    plan.role && plan.role !== "offer" ? [plan.role, "offer"] : ["offer"];
  const needsSince = roleStartsContract(role);
  const prices = (effective && plan.effectiveTariff) || plan.tariff;
  const tariff = prices
    ? { ...prices, name: name.trim() || provider, provider }
    : null;
  const bill = { ...plan.bill, month, provider, tariff };
  const warnings = [
    ...plan.warnings,
    ...(recordBill && duplicateBill(w, bill)
      ? [
          "Ya tienes una factura de la misma comercializadora para este período.",
        ]
      : []),
  ];

  function save(e: FormEvent) {
    e.preventDefault();
    const checked = billSchema.safeParse(bill);
    if (recordBill && !checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    if (!recordBill && !updateProfile && !saveTariff) {
      setError("Marca al menos una cosa que guardar.");
      return;
    }
    try {
      onSave({
        bill: recordBill && checked.success ? checked.data : null,
        profile: updateProfile ? plan.profile : null,
        tariff: saveTariff ? tariff : null,
        role,
        since: needsSince ? since : "",
      });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se ha podido guardar. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <form className="p-6 max-[520px]:p-5" onSubmit={save}>
      <p className={cn(sectionNote, "mt-0 flex items-center gap-2")}>
        <ShieldCheck size={16} aria-hidden />
        Nada de esta factura sale de tu dispositivo hasta que guardes lo que
        elijas.
      </p>
      {warnings.length > 0 && (
        <Alert className="mb-5 [&_ul]:m-0 [&_ul]:pl-5" role="note">
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      <section>
        {canRecordBills ? (
          <label className={checkboxLabel}>
            <Checkbox
              checked={recordBill}
              onCheckedChange={(checked) => setRecordBill(checked === true)}
            />
            Registrar la factura
          </label>
        ) : (
          <h3 className={sectionTitle}>Tu factura</h3>
        )}
        <p className={sectionNote}>
          Del {shortDate(plan.bill.periodStart)} al{" "}
          {shortDate(plan.bill.periodEnd)} · {formatKwh(Number(plan.bill.kwh))}{" "}
          · {money(Number(plan.bill.paid))} pagados.{" "}
          {canRecordBills &&
            (plan.breakdownNote || "Con su desglose, impuestos incluidos.")}
        </p>
        <div className={cn(two, "mb-4")}>
          <Field
            label="Comercializadora"
            value={provider}
            onChange={setProvider}
            required
          />
          {recordBill && (
            <Field
              label="Mes de la factura"
              type="month"
              value={month}
              onChange={setMonth}
              required
            />
          )}
        </div>
      </section>

      <section className={formSection}>
        <label className={checkboxLabel}>
          <Checkbox
            checked={updateProfile}
            onCheckedChange={(checked) => setUpdateProfile(checked === true)}
          />
          Usar esta factura como perfil de consumo
        </label>
        <ProfileChange before={w.profile} after={plan.profile} />
      </section>

      <section className={formSection}>
        <h3 className={sectionTitle}>Tarifa</h3>
        {plan.tariff ? (
          <>
            <label className={cn(checkboxLabel, "mt-3")}>
              <Checkbox
                checked={saveTariff}
                onCheckedChange={(checked) => setSaveTariff(checked === true)}
              />
              Guardar los precios de esta factura
            </label>
            {tariff && (
              <p className={sectionNote}>
                {energyDescription(tariff)} · {powerDescription(tariff)}
              </p>
            )}
            {saveTariff && (
              <>
                <Field
                  label="Nombre de la tarifa"
                  className="my-4"
                  value={name}
                  onChange={setName}
                />
                {plan.effectiveTariff && (
                  <label className={cn(selectLabel, tallSelect)}>
                    Precios
                    <NativeSelect
                      className="mt-1.5 w-full"
                      value={effective ? "effective" : "list"}
                      onChange={(e) =>
                        setEffective(e.target.value === "effective")
                      }
                    >
                      <NativeSelectOption value="list">
                        Precios de lista (antes del descuento)
                      </NativeSelectOption>
                      <NativeSelectOption value="effective">
                        Precios efectivos (con el descuento aplicado)
                      </NativeSelectOption>
                    </NativeSelect>
                  </label>
                )}
                <label className={cn(selectLabel, tallSelect)}>
                  Qué es esta tarifa
                  <NativeSelect
                    className="mt-1.5 w-full"
                    value={role}
                    onChange={(e) => setRole(e.target.value as TariffRole)}
                  >
                    {roles.map((r) => (
                      <NativeSelectOption key={r} value={r}>
                        {roleLabels[r]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
                {role === "matches-current" && (
                  <p className={sectionNote}>
                    Los precios coinciden con tu tarifa actual: no se crea otra.
                  </p>
                )}
                {needsSince && (
                  <Field
                    label={
                      role === "current"
                        ? "Desde cuándo tienes esta tarifa"
                        : "Desde cuándo tienes los nuevos precios"
                    }
                    hint="La factura no lo indica: búscalo en tu contrato o en el aviso de cambio de precios."
                    type="date"
                    value={since}
                    onChange={setSince}
                    required
                  />
                )}
              </>
            )}
          </>
        ) : (
          <p className={sectionNote}>{plan.tariffNote}</p>
        )}
      </section>

      {error && (
        <Alert variant="destructive" role="alert" className="mt-4">
          {error}
        </Alert>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2.5 border-t border-border pt-5">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

function ProfileChange({ before, after }: { before: Profile; after: Profile }) {
  const value = (key: keyof Profile, unit: string) => (p: Profile) =>
    p[key] === "" ? "—" : `${decimalComma(String(p[key]))}${unit}`;
  const rows: [string, (p: Profile) => string][] = [
    ["Días", value("days", "")],
    ["Consumo punta (P1)", value("peakKwh", " kWh")],
    ["Consumo llano (P2)", value("flatKwh", " kWh")],
    ["Consumo valle (P3)", value("valleyKwh", " kWh")],
    ["Potencia punta (P1)", value("peakKw", " kW")],
    ["Potencia valle (P2)", value("valleyKw", " kW")],
    [
      "Impuestos",
      (p) =>
        p.taxes
          ? `IVA ${decimalComma(p.vat)} % · IEE ${decimalComma(p.electricityTax)} %`
          : "Sin impuestos",
    ],
  ];
  const hadValues = (["days", "peakKwh", "peakKw"] as const).some(
    (key) => before[key] !== "",
  );
  return (
    <table className="mt-3 mb-1 w-full text-sm-plus">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-1 font-medium">
            <span className="sr-only">Dato</span>
          </th>
          {hadValues && <th className="py-1 font-medium">Ahora</th>}
          <th className="py-1 font-medium">Con la factura</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, show]) => (
          <tr key={label} className="border-t border-border">
            <th className="py-1 text-left font-normal">{label}</th>
            {hadValues && <td className="py-1">{show(before)}</td>}
            <td className="py-1 font-semibold">{show(after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function energyDescription(t: Tariff) {
  return t.kind === "fixed"
    ? `${decimalComma(t.energyPeak)} €/kWh las 24 horas`
    : `P1 ${decimalComma(t.energyPeak)} · P2 ${decimalComma(t.energyFlat)} · P3 ${decimalComma(t.energyValley)} €/kWh`;
}
