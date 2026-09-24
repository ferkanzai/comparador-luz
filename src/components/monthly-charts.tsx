"use client";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { billGroups as groups } from "@/lib/bill-data";
import { consumptionGroups } from "@/lib/bill-consumption";
import { useMediaQuery } from "@/hooks/use-media-query";
import { chartAxisWidth, lineStyle, type SeriesKey } from "./bill-styles";

/*
 * The drawings of the monthly charts, on Recharts. Loaded on demand, so the
 * library only downloads when a chart is shown. Selecting a month stays with
 * the buttons laid over each drawing, which start after the Y axis.
 */

type Totals = Record<(typeof groups)[number][0], number>;

const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const kwh = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

/** Stripes for the parts that are not a single concept. */
function Stripes({
  id,
  a,
  b,
  angle,
}: {
  id: string;
  a: string;
  b: string;
  angle: number;
}) {
  return (
    <pattern
      id={id}
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${angle})`}
    >
      <rect width="6" height="6" fill={b} />
      <rect width="3" height="6" fill={a} />
    </pattern>
  );
}

/** The grid and axes every monthly chart shares. */
function frame(format: (value: number) => string) {
  return [
    <CartesianGrid key="grid" vertical={false} strokeDasharray="3 3" />,
    <XAxis key="x" dataKey="month" hide scale="band" />,
    <YAxis
      key="y"
      width={chartAxisWidth}
      tickLine={false}
      axisLine={false}
      tickCount={5}
      tickFormatter={format}
      className="text-xs"
    />,
  ];
}
const chartBox = "aspect-auto h-[260px] w-full";

/** Rounds the topmost part of each stack that has any value. */
function topOf<K extends string>(keys: K[], rows: Record<K, number>[]) {
  return [...keys].reverse().find((key) => rows.some((r) => r[key] > 0));
}

const billConfig = {
  energy: { label: "Energía", color: "var(--chart-1)" },
  power: { label: "Potencia", color: "var(--chart-2)" },
  other: { label: "Otros cargos", color: "var(--chart-3)" },
  taxes: { label: "Impuestos", color: "var(--chart-4)" },
  unknown: { label: "Sin desglose", color: "url(#bills-unknown)" },
  credit: { label: "Descuentos", color: "url(#bills-credit)" },
  paid: { label: "Pagado", color: "var(--foreground)" },
} satisfies ChartConfig;

export function BillsBars({
  months,
}: {
  months: { month: string; totals: Totals }[];
}) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data = useMemo(
    () => months.map((m) => ({ month: m.month, ...m.totals })),
    [months],
  );
  const top = topOf(
    groups.filter(([key]) => key !== "credit").map(([key]) => key),
    months.map((m) => m.totals),
  );
  return (
    <ChartContainer config={billConfig} className={chartBox} aria-hidden="true">
      <BarChart
        data={data}
        stackOffset="sign"
        barCategoryGap="20%"
        margin={{ top: 38, right: 0, bottom: 32, left: 0 }}
        accessibilityLayer={false}
      >
        <defs>
          <Stripes
            id="bills-unknown"
            a="var(--chart-5)"
            b="var(--chart-5-soft)"
            angle={45}
          />
          <Stripes
            id="bills-credit"
            a="var(--destructive)"
            b="var(--chart-credit)"
            angle={135}
          />
        </defs>
        {frame((value) => euros.format(value))}
        {groups.map(([key]) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="bill"
            fill={`var(--color-${key})`}
            maxBarSize={48}
            isAnimationActive={!still}
            // Recharts flips negative bars, so the credit's outer end is its "top".
            radius={key === "credit" || key === top ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** One line per concept; months without bills break the lines. */
export function BillsLines({
  months,
  series,
  active,
}: {
  months: { month: string; count: number; amount: number; totals: Totals }[];
  series: SeriesKey[];
  /** The selected month's index, drawn with larger points. */
  active: number;
}) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data = useMemo(
    () =>
      months.map((m) => ({
        month: m.month,
        ...Object.fromEntries(
          [...groups.map(([key]) => key), "paid" as const].map((key) => [
            key,
            m.count ? (key === "paid" ? m.amount : m.totals[key]) : null,
          ]),
        ),
      })),
    [months],
  );
  return (
    <ChartContainer config={billConfig} className={chartBox} aria-hidden="true">
      <LineChart
        data={data}
        margin={{ top: 38, right: 0, bottom: 32, left: 0 }}
        accessibilityLayer={false}
      >
        {frame((value) => euros.format(value))}
        {series.map((key) => {
          const style = lineStyle[key];
          return (
            <Line
              key={key}
              dataKey={key}
              stroke={style.color}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              isAnimationActive={!still}
              activeDot={false}
              dot={({ cx, cy, index, value }) =>
                value === null || value === undefined ? (
                  <g key={index} />
                ) : (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={index === active ? 6 : 4}
                    fill={style.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )
              }
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
}

const periodConfig = {
  peakKwh: { label: "P1 · Punta", color: "var(--period-1)" },
  flatKwh: { label: "P2 · Llano", color: "var(--period-2)" },
  valleyKwh: { label: "P3 · Valle", color: "var(--period-3)" },
  unallocated: { label: "Sin reparto", color: "url(#consumption-unallocated)" },
} satisfies ChartConfig;

/** Recorded kWh by energy period, stacked. */
export function ConsumptionBars({
  months,
}: {
  months: {
    month: string;
    totals: Record<keyof typeof periodConfig, number>;
  }[];
}) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data = useMemo(
    () => months.map((m) => ({ month: m.month, ...m.totals })),
    [months],
  );
  const keys = consumptionGroups.map(([key]) => key);
  const top = topOf(
    keys,
    months.map((m) => m.totals),
  );
  return (
    <ChartContainer
      config={periodConfig}
      className={chartBox}
      aria-hidden="true"
    >
      <BarChart
        data={data}
        barCategoryGap="20%"
        margin={{ top: 48, right: 0, bottom: 32, left: 0 }}
        accessibilityLayer={false}
      >
        <defs>
          <Stripes
            id="consumption-unallocated"
            a="var(--chart-5-soft)"
            b="var(--border)"
            angle={135}
          />
        </defs>
        {frame((value) => kwh.format(value))}
        {keys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="kwh"
            fill={`var(--color-${key})`}
            maxBarSize={48}
            isAnimationActive={!still}
            radius={key === top ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** Two years side by side, month by month. */
export function YearBars({
  rows,
  metric,
}: {
  rows: { label: string; first: number | null; second: number | null }[];
  metric: "paid" | "consumption";
}) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data = useMemo(
    () =>
      rows.map((r) => ({ month: r.label, first: r.first, second: r.second })),
    [rows],
  );
  return (
    <ChartContainer
      config={{
        first: { label: "Primer año", color: "var(--period-2)" },
        second: { label: "Segundo año", color: "var(--primary)" },
      }}
      className={chartBox}
      aria-hidden="true"
    >
      <BarChart
        data={data}
        barGap={4}
        barCategoryGap="22%"
        margin={{ top: 58, right: 0, bottom: 32, left: 0 }}
        accessibilityLayer={false}
      >
        {frame((value) =>
          metric === "paid" ? euros.format(value) : kwh.format(value),
        )}
        {(["first", "second"] as const).map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            maxBarSize={28}
            isAnimationActive={!still}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
