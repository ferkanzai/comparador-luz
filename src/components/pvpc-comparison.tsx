"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, History } from "lucide-react";
import {
  money,
  numberOf,
  shortDate,
  type Profile,
  type Tariff,
} from "@/lib/domain";
import { calculate } from "@/lib/calculator";
import { billLines } from "@/lib/bill-data";
import {
  formatRate,
  meterRental,
  meterRentalLabel,
  socialFinancing2026,
} from "@/lib/regulated-rates";
import {
  calculatePvpc,
  pvpcMonthSchema,
  pvpcPeriodLabels,
  pvpcPeriods,
  pvpcPowerSource,
  pvpcSource,
  type PvpcMonth,
} from "@/lib/pvpc";
import { Field } from "./ui";

const monthYearFormat = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function PvpcComparison({
  profile,
  current,
}: {
  profile: Profile;
  current?: Tariff;
}) {
  const [data, setData] = useState<PvpcMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meter, setMeter] = useState("single");
  const [customMeter, setCustomMeter] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pvpc", {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(30_000),
        ]),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "No se han podido consultar los precios PVPC.",
        );
      setData(pvpcMonthSchema.parse(body));
    } catch {
      if (!controller.signal.aborted)
        setError(
          "No hemos podido cargar el mes completo de PVPC. Puedes reintentar; tus tarifas siguen disponibles.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  const meterDay =
    meter === "owned"
      ? "0"
      : meter === "current"
        ? (current?.meterDay ?? "")
        : meter === "custom"
          ? customMeter
          : String(
              (meterRental[meter === "three" ? "three-2013" : "single-2013"]
                .monthly *
                12) /
                365,
            );
  const cost = data ? calculatePvpc(data, profile, meterDay) : null;
  const baseline = current ? calculate(current, profile) : null;
  const ineligible =
    numberOf(profile.peakKw) > 10 || numberOf(profile.valleyKw) > 10;
  const monthLabel = data
    ? monthYearFormat.format(new Date(`${data.month}-01T12:00:00Z`))
    : "";
  return (
    <section
      className="panel pvpc-panel"
      aria-label="Comparación histórica PVPC"
    >
      <div className="pvpc-heading">
        <span className="eyebrow">
          <History size={15} aria-hidden="true" /> REFERENCIA HISTÓRICA
        </span>
        <span className="pill">Aproximado</span>
      </div>
      <h2>¿Y con la tarifa regulada?</h2>
      <p className="muted">
        Compara tu consumo con los precios PVPC del último mes completo. Una
        referencia para orientarte: el próximo mes puede ser distinto.
      </p>
      {ineligible ? (
        <p className="notice">
          PVPC requiere un máximo de 10 kW en cada período. Tus potencias
          superan ese límite.
        </p>
      ) : !data ? (
        <button
          type="button"
          className="button secondary"
          onClick={load}
          disabled={loading}
        >
          {loading
            ? "Consultando el mes en ESIOS…"
            : error
              ? "Reintentar PVPC"
              : "Comparar con PVPC"}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      ) : (
        <>
          <p className="pvpc-month">
            Precios de {monthLabel}{" "}
            <span>· {data.hours} horas verificadas</span>
          </p>
          <dl className="pvpc-prices">
            {pvpcPeriods.map((period) => (
              <div key={period}>
                <dt>{pvpcPeriodLabels[period]}</dt>
                <dd>
                  {data.mean[period].toLocaleString("es-ES", {
                    minimumFractionDigits: 5,
                    maximumFractionDigits: 5,
                  })}
                  <small> €/kWh</small>
                </dd>
              </div>
            ))}
          </dl>
          <p className="small muted">
            Medias sin impuestos. Suponemos el mismo consumo en cada hora dentro
            de cada período.
          </p>
          <label className="auth-label">
            Alquiler para esta estimación
            <select value={meter} onChange={(e) => setMeter(e.target.value)}>
              <option value="single">
                {meterRentalLabel("single-2013")} (estimado)
              </option>
              <option value="three">
                {meterRentalLabel("three-2013")} (estimado)
              </option>
              <option value="owned">Contador en propiedad · 0 €</option>
              <option
                value="current"
                disabled={!current || current.meterDay === ""}
              >
                Usar alquiler de mi tarifa actual
              </option>
              <option value="custom">Introducir otro importe diario</option>
            </select>
          </label>
          {meter === "custom" && (
            <Field
              label="Alquiler diario PVPC"
              value={customMeter}
              onChange={setCustomMeter}
              unit="€/día"
              decimal
            />
          )}
          {cost ? (
            <>
              <div className="pvpc-total">
                <div>
                  <span>Total orientativo</span>
                  <strong>{money(cost.total)}</strong>
                </div>
                <p className="small">
                  Tu consumo de {profile.days} días ·{" "}
                  {profile.taxes ? "con tus impuestos" : "sin impuestos"}
                </p>
              </div>
              {baseline && current && (
                <p className="small">
                  Con estos supuestos:{" "}
                  <strong>
                    {money(Math.abs(baseline.total - cost.total))}{" "}
                    {cost.total <= baseline.total ? "menos" : "más"}
                  </strong>{" "}
                  que {current.name} para el mismo consumo y días. Es una
                  diferencia histórica, no un ahorro garantizado.
                </p>
              )}
              <details className="pvpc-details">
                <summary>Desglose y supuestos</summary>
                <dl className="bill-breakdown">
                  {billLines.map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{money(cost[key])}</dd>
                    </div>
                  ))}
                </dl>
                <p className="small muted">
                  Potencia regulada de 2026, incluido el margen fijo de
                  comercialización. Bono social:{" "}
                  {formatRate(socialFinancing2026.annual)} €/año, sin descuento
                  para beneficiarios. Alquiler:{" "}
                  {numberOf(meterDay).toLocaleString("es-ES", {
                    maximumFractionDigits: 6,
                  })}{" "}
                  €/día. Sin servicios adicionales. Usamos los impuestos que has
                  elegido en el comparador; revisa que correspondan a tu
                  factura.
                </p>
                <p className="small muted">
                  Aplicamos las medias de {monthLabel} a tu consumo y días,
                  aunque tu factura corresponda a otro período. Sin tu curva
                  horaria no podemos reconstruir la factura PVPC real. Hogares
                  de Península y Baleares, hasta 10 kW por período.
                </p>
              </details>
            </>
          ) : (
            <p className="notice">
              Completa arriba el consumo por períodos, los kW y los días. Si
              activas impuestos, indica sus porcentajes. Revisa también el
              alquiler elegido.
            </p>
          )}
          <p className="small muted pvpc-sources">
            <a
              className="text-link"
              href={pvpcSource}
              target="_blank"
              rel="noreferrer"
            >
              Precios: REE / ESIOS
            </a>
            {" · "}
            <a
              className="text-link"
              href={pvpcPowerSource}
              target="_blank"
              rel="noreferrer"
            >
              Potencia y cargos
            </a>
            {" · "}Consultado el {shortDate(data.fetchedAt.slice(0, 10))}.
          </p>
        </>
      )}
      {loading && (
        <p role="status" className="small muted">
          Comprobando que no falte ningún día ni hora.
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </section>
  );
}
