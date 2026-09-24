"use client";

import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Plus,
  Receipt,
  SlidersHorizontal,
  Zap,
  X,
  Columns3,
} from "lucide-react";
import { calculate } from "@/lib/calculator";
import {
  decimalComma,
  numberOf,
  profileSchema,
  today,
  type Profile,
  type Workspace,
  type Bill,
} from "@/lib/domain";
import {
  startSimulation,
  readSimulation,
  type ConsumptionSimulation,
} from "@/lib/consumption-simulation";
import ConsumptionSimulator from "./consumption-simulator";
import { canAddTariff } from "@/lib/workspace-actions";
import { tariffLimitMessage } from "@/lib/tariff-periods";
import { carryFinalists } from "@/lib/finalist-selection";
import { billFromCalculation } from "@/lib/bill-data";
import ComparisonTable, {
  TariffDetails,
  type ComparisonRow,
  type TariffActions,
} from "./comparison-table";
import { usePowerComparisonUnit } from "./use-power-comparison-unit";
import { ProfileFields, TaxFields, TaxAssumptions } from "./profile-fields";
import { Empty, Modal } from "./ui";
import FinalistComparison from "./finalist-comparison";
import PvpcComparison from "./pvpc-comparison";
import { commands, type WorkspaceCommand } from "@/lib/workspace-commands";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

const profileStat =
  "flex flex-col gap-0.5 max-[600px]:min-w-[110px] max-[600px]:flex-1 max-[600px]:basis-[40%]";
const profileStatValue =
  "font-heading text-xl font-bold tracking-[-0.4px] tabular-nums";
const profileStatUnit = "font-sans text-xs-plus font-normal tracking-normal";
const profileStatNote = "text-xs text-muted-foreground max-[600px]:text-3xs";
const profileButton = "max-[600px]:ml-0";

const quantity = (value: number) =>
  value.toLocaleString("es-ES", { maximumFractionDigits: 3 });

export default function ComparisonWorkspace({
  data,
  run,
  onAdd,
  actions,
  onBill,
  onMethod,
  detailId,
  onDetails,
}: {
  /** The tariff whose details are open; the dashboard owns it so forms can return to it. */
  detailId: string | null;
  onDetails: (id: string | null) => void;
  data: Workspace;
  run: (command: WorkspaceCommand) => void;
  onAdd: () => void;
  actions: TariffActions;
  onBill?: (bill: Bill) => void;
  onMethod: () => void;
}) {
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulation, setSimulation] = useState<ConsumptionSimulation | null>(
    null,
  );
  const simulationValue = simulation ?? startSimulation(data.profile);
  const simulationResult = readSimulation(simulationValue);
  const effectiveProfile = simulation
    ? {
        ...data.profile,
        ...(simulationResult.consumption ?? {
          peakKwh: "",
          flatKwh: "",
          valleyKwh: "",
        }),
      }
    : data.profile;
  const [selected, setSelected] = useState<string[] | null>(null);
  const [selectionBasis, setSelectionBasis] = useState(data);
  if (selectionBasis !== data) {
    setSelectionBasis(data);
    if (selected) setSelected(carryFinalists(selected, selectionBasis, data));
  }
  const selectedIds = (
    selected ?? (data.currentId ? [data.currentId] : [])
  ).filter((id) => data.tariffs.some((tariff) => tariff.id === id));
  const [finalistsOpen, setFinalistsOpen] = useState(false);
  function toggleFinalist(id: string) {
    setSelected(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : selectedIds.length < 3
          ? [...selectedIds, id]
          : selectedIds,
    );
  }
  const changeProfile = (profile: Profile) =>
    run(commands.updateProfile(profile));
  const tariffRoom = canAddTariff(data);
  const [profileOpen, setProfileOpen] = useState(false);
  const current = data.tariffs.find((tariff) => tariff.id === data.currentId);
  const [unit, setUnit] = usePowerComparisonUnit(current?.powerUnit ?? "day");
  const profile = data.profile;
  const validProfile = profileSchema.safeParse(profile).success;
  const consumptionKnown =
    validProfile &&
    [profile.peakKwh, profile.flatKwh, profile.valleyKwh].every(
      (value) => value !== "",
    );
  const total = consumptionKnown
    ? numberOf(profile.peakKwh) +
      numberOf(profile.flatKwh) +
      numberOf(profile.valleyKwh)
    : null;
  const unequalPower =
    profile.peakKw !== "" &&
    profile.valleyKw !== "" &&
    numberOf(profile.peakKw) !== numberOf(profile.valleyKw);
  const rows: ComparisonRow[] = data.tariffs
    .map((tariff) => {
      const expired =
        tariff.id !== data.currentId &&
        tariff.validUntil !== "" &&
        tariff.validUntil < today();
      const cost = expired ? null : calculate(tariff, effectiveProfile);
      const reason = expired
        ? "Fuera de comparativa · Oferta caducada"
        : simulation && simulationResult.error
          ? "Completa la simulación"
          : cost
            ? ""
            : tariff.powerKind === "combined" && unequalPower
              ? "Requiere la misma potencia en P1 y P2"
              : "Completa los precios y el perfil de consumo";
      return { tariff, cost, reason };
    })
    .sort((a, b) => (a.cost?.total ?? Infinity) - (b.cost?.total ?? Infinity));
  const baseline = rows.find((row) => row.tariff.id === data.currentId);
  const detail = rows.find((row) => row.tariff.id === detailId);
  return (
    <div className="min-w-0">
      <section
        className="mb-8 flex items-center gap-7 rounded-lg border border-border bg-muted px-6 py-5 max-[1000px]:flex-wrap max-[1000px]:gap-5 max-[600px]:mb-6 max-[600px]:gap-3 max-[600px]:p-4"
        aria-label="Perfil compartido de consumo"
      >
        <div className="flex items-center gap-3 border-r border-border-accent pr-6 text-xs-plus leading-[1.45] max-[1000px]:border-r-0 max-[1000px]:pr-0 max-[600px]:-order-2 max-[600px]:basis-full max-[600px]:text-xs">
          <SlidersHorizontal size={19} className="shrink-0" />
          <span>
            Un mismo consumo.
            <br className="max-[600px]:hidden" />
            <strong className="font-[650] max-[600px]:before:whitespace-pre max-[600px]:before:content-['_']">
              Todas tus tarifas.
            </strong>
          </span>
        </div>
        <div className={profileStat}>
          <strong className={profileStatValue}>
            {total === null ? "—" : quantity(total)}{" "}
            <small className={profileStatUnit}>kWh</small>
          </strong>
          <span className={profileStatNote}>
            Punta {decimalComma(profile.peakKwh)} · Llano{" "}
            {decimalComma(profile.flatKwh)} · Valle{" "}
            {decimalComma(profile.valleyKwh)}
          </span>
        </div>
        <div className={profileStat}>
          <strong className={profileStatValue}>
            {profile.days || "—"}{" "}
            <small className={profileStatUnit}>días</small>
          </strong>
          <span className={profileStatNote}>
            P1 {decimalComma(profile.peakKw)} / P2{" "}
            {decimalComma(profile.valleyKw)} kW ·{" "}
            {profile.taxes ? "Con impuestos" : "Sin impuestos"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(profileButton, "ml-auto")}
          onClick={() => setProfileOpen(true)}
        >
          Editar perfil <ArrowRight size={15} />
        </Button>
        {/* Simulating only means something once there are tariffs to compare. */}
        {data.tariffs.length > 0 && (
          <Button
            variant="inverse"
            size="sm"
            className={cn(profileButton, "-ml-5 max-[1000px]:ml-0")}
            aria-expanded={simulationOpen}
            onClick={() => setSimulationOpen(true)}
          >
            Simular consumo
          </Button>
        )}
      </section>
      {simulationOpen && (
        <ConsumptionSimulator
          value={simulationValue}
          consumption={simulationResult.consumption}
          error={simulationResult.error}
          active={simulation !== null}
          onChange={setSimulation}
          onReset={() => setSimulation(null)}
          onClose={() => {
            setSimulation(null);
            setSimulationOpen(false);
          }}
          onAdopt={() => {
            if (simulationResult.consumption) {
              run(commands.adoptSimulation(simulationResult.consumption));
              setSimulation(null);
              setSimulationOpen(false);
            }
          }}
        />
      )}
      <section aria-labelledby="comparison-heading">
        <div className="mb-5 flex items-center justify-between gap-4 max-[600px]:gap-2">
          <div>
            <span className="text-3xs font-semibold tracking-[1.4px] text-muted-foreground">
              TU CONSUMO, FRENTE A CADA OFERTA
            </span>
            <h2
              id="comparison-heading"
              className="m-0 mt-1 flex items-center gap-3 font-heading text-3xl font-bold tracking-[-1px] max-[600px]:gap-2 max-[600px]:text-xl"
            >
              Tus tarifas, en claro
              <span className="inline-grid h-[27px] min-w-[27px] place-items-center rounded-full border border-border font-sans text-xs leading-normal font-medium tracking-normal">
                {data.tariffs.length}
              </span>
            </h2>
          </div>
          {/* With no tariffs, the empty state's button is the one call to action. */}
          {data.tariffs.length > 0 && (
            <Button
              disabled={!tariffRoom}
              aria-describedby={tariffRoom ? undefined : "tariff-limit"}
              onClick={onAdd}
            >
              <Plus size={17} />
              Añadir tarifa
            </Button>
          )}
        </div>
        {!tariffRoom && (
          <Alert id="tariff-limit" role="note">
            {tariffLimitMessage}
          </Alert>
        )}
        {!data.tariffs.length ? (
          <Card className="gap-0 py-0">
            <Empty
              icon={<Zap size={26} />}
              title="Empecemos por tu tarifa actual."
              action={
                <div className="grid justify-items-center gap-1">
                  <Button onClick={onAdd}>Añadir mi tarifa actual</Button>
                  <CnmcLink />
                </div>
              }
            >
              Ten tu última factura a mano. Añade tus precios y después las
              ofertas que quieras comparar.
            </Empty>
          </Card>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-4 max-[1000px]:flex-wrap max-[600px]:flex-nowrap max-[600px]:items-end max-[600px]:gap-2">
              <p className="m-0 text-xs font-semibold max-[600px]:text-2xs">
                {profile.days || "—"} días ·{" "}
                <TaxAssumptions profile={profile} />{" "}
                <span className="ml-3 text-xs font-normal text-muted-foreground max-[600px]:mt-0.5 max-[600px]:ml-0 max-[600px]:block max-[600px]:text-3xs">
                  {simulation
                    ? "Simulación activa · Costes hipotéticos"
                    : "Ordenadas por coste estimado"}
                </span>
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground max-[600px]:shrink-0 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-1 max-[600px]:text-3xs">
                Comparar potencia en{" "}
                <NativeSelect
                  className="text-foreground *:[select]:min-h-[38px]"
                  aria-label="Comparar potencia en"
                  value={unit}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "day" ||
                      value === "month" ||
                      value === "year"
                    )
                      setUnit(value);
                  }}
                >
                  <NativeSelectOption value="day">€/kW/día</NativeSelectOption>
                  <NativeSelectOption value="month">
                    €/kW/mes
                  </NativeSelectOption>
                  <NativeSelectOption value="year">€/kW/año</NativeSelectOption>
                </NativeSelect>
              </label>
            </div>
            <div
              className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 pt-2.5 pb-3.5"
              aria-label="Selección de finalistas"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-2 text-2xs text-muted-foreground">
                  <Columns3 size={16} className="shrink-0" />
                  {selectedIds.length}/3 finalistas
                </span>
                {selectedIds.map((id) => (
                  <button
                    className="inline-flex max-w-[240px] items-center gap-2 rounded-sm border border-border-accent bg-success-muted px-2 py-1 font-sans text-2xs wrap-anywhere text-foreground"
                    key={id}
                    onClick={() => toggleFinalist(id)}
                    aria-label={`Quitar ${data.tariffs.find((tariff) => tariff.id === id)?.name} de finalistas`}
                  >
                    {data.tariffs.find((tariff) => tariff.id === id)?.name}
                    <X size={12} className="shrink-0" />
                  </button>
                ))}
              </div>
              <Button
                variant="link"
                size="inline"
                className="ml-auto text-xs whitespace-nowrap disabled:text-muted-foreground"
                disabled={selectedIds.length < 2}
                onClick={() => setFinalistsOpen(true)}
              >
                Ver comparación ({selectedIds.length})<ArrowRight size={14} />
              </Button>
              {selectedIds.length < 2 && (
                <span className="text-3xs text-muted-foreground max-[600px]:hidden">
                  Marca tarifas para verlas en detalle
                </span>
              )}
            </div>
            <ComparisonTable
              selectedIds={selectedIds}
              onToggle={toggleFinalist}
              rows={rows}
              currentId={data.currentId}
              unit={unit}
              onDetails={onDetails}
              onEdit={actions.onEdit}
              onRemove={actions.onRemove}
            />
            <div className="flex justify-between gap-6 px-0.5 py-3 text-3xs text-muted-foreground max-[1000px]:flex-col max-[1000px]:gap-1.5">
              <p className="m-0">
                Precios unitarios sin impuestos. Potencia para comparar:
                referencia de 1 kW en cada período. Mes = 30 días · Año = 365
                días.
              </p>
            </div>
            {unequalPower && (
              <Alert role="note">
                Tus potencias P1 y P2 son distintas. La referencia de potencia
                no representa tu coste; la estimación usa tus kW contratados.
              </Alert>
            )}
          </>
        )}
      </section>
      {onBill && baseline?.cost && (
        <div className="my-5 flex items-center gap-3.5 max-[600px]:flex-col max-[600px]:items-start">
          <Button
            variant="outline"
            size="sm"
            disabled={!baseline?.cost || simulation !== null}
            onClick={() => {
              if (baseline?.cost && !simulation)
                onBill(
                  billFromCalculation(baseline.tariff, profile, baseline.cost),
                );
            }}
          >
            <Receipt size={16} />
            Guardar este período como factura
          </Button>
          <p className="m-0 text-sm-plus text-muted-foreground">
            {simulation
              ? "Restablece o usa el consumo simulado antes de crear una factura. Después, revisa los importes reales."
              : "Revisa el consumo y los importes de la factura real antes de guardarla."}
          </p>
        </div>
      )}
      {/* With no tariffs, the CNMC link sits in the empty state instead. */}
      {data.tariffs.length > 0 && (
        <div className="mt-6 border-t border-border pt-6">
          <PvpcComparison profile={effectiveProfile} current={current} />
          <CnmcLink />
        </div>
      )}
      {profileOpen && (
        <Modal
          title="Tu perfil de consumo"
          onClose={() => setProfileOpen(false)}
        >
          <div className="p-6 max-[520px]:p-5">
            <p className="m-0 mb-5 text-sm-plus text-muted-foreground">
              Estos datos se aplican a todas tus tarifas y se guardan
              automáticamente.
            </p>
            <ProfileFields value={profile} onChange={changeProfile} />
            <TaxFields value={profile} onChange={changeProfile} />
            <Button variant="link" size="inline" onClick={onMethod}>
              Cómo calculamos los impuestos
            </Button>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5 border-t border-border pt-5">
              <Button onClick={() => setProfileOpen(false)}>
                Volver a la comparativa
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {finalistsOpen && (
        <FinalistComparison
          rows={selectedIds.flatMap((id) => {
            const row = rows.find((row) => row.tariff.id === id);
            return row ? [row] : [];
          })}
          currentId={data.currentId}
          baseline={baseline?.cost?.total}
          unit={unit}
          profile={effectiveProfile}
          simulation={simulation !== null}
          onClose={() => setFinalistsOpen(false)}
        />
      )}
      {detail && (
        <TariffDetails
          row={detail}
          current={detail.tariff.id === data.currentId}
          unit={unit}
          actions={actions}
          canDuplicate={tariffRoom}
          onClose={() => onDetails(null)}
        />
      )}
    </div>
  );
}

function CnmcLink() {
  return (
    <a
      className="mt-3.5 inline-flex min-h-11 items-center gap-2 text-xs-plus font-semibold text-inherit no-underline underline-offset-4 hover:text-primary hover:underline"
      href="https://comparador.cnmc.gob.es/"
      target="_blank"
      rel="noreferrer"
    >
      Buscar otras ofertas en la CNMC{" "}
      <ExternalLink size={15} className="shrink-0" />
    </a>
  );
}
