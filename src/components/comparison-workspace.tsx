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
import {
  adoptSimulation,
  canAddTariff,
  updateProfile,
} from "@/lib/workspace-actions";
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

const quantity = (value: number) =>
  value.toLocaleString("es-ES", { maximumFractionDigits: 3 });

export default function ComparisonWorkspace({
  data,
  onChange,
  onAdd,
  actions,
  onBill,
  onMethod,
}: {
  data: Workspace;
  onChange: (next: Workspace) => void;
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
    onChange(updateProfile(data, profile));
  const tariffRoom = canAddTariff(data);
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
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
    <div className="comparison-workspace">
      <section
        className="profile-strip"
        aria-label="Perfil compartido de consumo"
      >
        <div className="profile-strip-title">
          <SlidersHorizontal size={19} />
          <span>
            Un mismo consumo.
            <br />
            <strong>Todas tus tarifas.</strong>
          </span>
        </div>
        <div className="profile-stat">
          <strong>
            {total === null ? "—" : quantity(total)} <small>kWh</small>
          </strong>
          <span>
            Punta {decimalComma(profile.peakKwh)} · Llano{" "}
            {decimalComma(profile.flatKwh)} · Valle{" "}
            {decimalComma(profile.valleyKwh)}
          </span>
        </div>
        <div className="profile-stat">
          <strong>
            {profile.days || "—"} <small>días</small>
          </strong>
          <span>
            P1 {decimalComma(profile.peakKw)} / P2{" "}
            {decimalComma(profile.valleyKw)} kW ·{" "}
            {profile.taxes ? "Con impuestos" : "Sin impuestos"}
          </span>
        </div>
        <button
          className="button secondary small-button"
          onClick={() => setProfileOpen(true)}
        >
          Editar perfil <ArrowRight size={15} />
        </button>
        <button
          className="button dark small-button"
          aria-expanded={simulationOpen}
          onClick={() => setSimulationOpen(true)}
        >
          Simular consumo
        </button>
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
              onChange(adoptSimulation(data, simulationResult.consumption));
              setSimulation(null);
              setSimulationOpen(false);
            }
          }}
        />
      )}
      <section
        className="comparison-results"
        aria-labelledby="comparison-heading"
      >
        <div className="comparison-heading">
          <div>
            <span className="eyebrow">TU CONSUMO, FRENTE A CADA OFERTA</span>
            <h2 id="comparison-heading">
              Tus tarifas, en claro
              <span className="tariff-count">{data.tariffs.length}</span>
            </h2>
          </div>
          <button
            className="button primary"
            disabled={!tariffRoom}
            aria-describedby={tariffRoom ? undefined : "tariff-limit"}
            onClick={onAdd}
          >
            <Plus size={17} />
            Añadir tarifa
          </button>
        </div>
        {!tariffRoom && (
          <p id="tariff-limit" className="notice small">
            {tariffLimitMessage}
          </p>
        )}
        {!data.tariffs.length ? (
          <div className="panel">
            <Empty
              icon={<Zap size={26} />}
              title="Empecemos por tu tarifa actual."
              action={
                <button className="button primary" onClick={onAdd}>
                  Añadir mi primera tarifa
                </button>
              }
            >
              Ten tu última factura a mano. Añade tus precios y después las
              ofertas que quieras comparar.
            </Empty>
          </div>
        ) : (
          <>
            <div className="comparison-toolbar">
              <p>
                {profile.days || "—"} días ·{" "}
                <TaxAssumptions profile={profile} />{" "}
                <span className="comparison-mode">
                  {simulation
                    ? "Simulación activa · Costes hipotéticos"
                    : "Ordenadas por coste estimado"}
                </span>
              </p>
              <label className="inline-label">
                Comparar potencia en{" "}
                <select
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
                  <option value="day">€/kW/día</option>
                  <option value="month">€/kW/mes</option>
                  <option value="year">€/kW/año</option>
                </select>
              </label>
            </div>
            <div className="finalist-bar" aria-label="Selección de finalistas">
              <div className="finalist-selection">
                <span>
                  <Columns3 size={16} />
                  {selectedIds.length}/3 finalistas
                </span>
                {selectedIds.map((id) => (
                  <button
                    className="finalist-chip"
                    key={id}
                    onClick={() => toggleFinalist(id)}
                    aria-label={`Quitar ${data.tariffs.find((tariff) => tariff.id === id)?.name} de finalistas`}
                  >
                    {data.tariffs.find((tariff) => tariff.id === id)?.name}
                    <X size={12} />
                  </button>
                ))}
              </div>
              <button
                className="text-link"
                disabled={selectedIds.length < 2}
                onClick={() => setFinalistsOpen(true)}
              >
                Ver comparación ({selectedIds.length})<ArrowRight size={14} />
              </button>
              {selectedIds.length < 2 && (
                <span className="finalist-help">
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
              onDetails={setDetailId}
              onEdit={actions.onEdit}
              onRemove={actions.onRemove}
            />
            <div className="comparison-footnotes">
              <p>
                Precios unitarios sin impuestos. Potencia para comparar:
                referencia de 1 kW en cada período. Mes = 30 días · Año = 365
                días.
              </p>
              <span className="scroll-hint">
                Desliza dentro de la tabla para ver todas las tarifas y precios
                ↕ ↔
              </span>
            </div>
            {unequalPower && (
              <p className="notice small">
                Tus potencias P1 y P2 son distintas. La referencia de potencia
                no representa tu coste; la estimación usa tus kW contratados.
              </p>
            )}
          </>
        )}
      </section>
      {onBill && (
        <div className="comparison-bill-action">
          <button
            className="button secondary small-button"
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
          </button>
          <p className="small muted">
            {simulation
              ? "Restablece o usa el consumo simulado antes de crear una factura. Después, revisa los importes reales."
              : "Revisa el consumo y los importes de la factura real antes de guardarla."}
          </p>
        </div>
      )}
      <div className="comparison-supplement">
        <PvpcComparison profile={effectiveProfile} current={current} />
        <a
          className="text-link"
          href="https://comparador.cnmc.gob.es/"
          target="_blank"
          rel="noreferrer"
        >
          Buscar otras ofertas en la CNMC <ExternalLink size={15} />
        </a>
      </div>
      {profileOpen && (
        <Modal
          title="Tu perfil de consumo"
          onClose={() => setProfileOpen(false)}
        >
          <div className="modal-body">
            <p className="muted">
              Estos datos se aplican a todas tus tarifas y se guardan
              automáticamente.
            </p>
            <ProfileFields value={profile} onChange={changeProfile} />
            <TaxFields value={profile} onChange={changeProfile} />
            <button className="text-link" onClick={onMethod}>
              Cómo calculamos los impuestos
            </button>
            <div className="modal-actions">
              <button
                className="button primary"
                onClick={() => setProfileOpen(false)}
              >
                Volver a la comparativa
              </button>
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
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
