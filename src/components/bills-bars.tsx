"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { billGroups as groups } from "@/lib/bill-data";
import { useMediaQuery } from "@/hooks/use-media-query";

/*
 * The drawing of the monthly bars, on Recharts. Loaded on demand, so the
 * library only downloads when the bars are shown. Selecting a month stays
 * with the buttons laid over it.
 */

type Totals = Record<(typeof groups)[number][0], number>;

const config = {
  energy: { label: "Energía", color: "var(--chart-1)" },
  power: { label: "Potencia", color: "var(--chart-2)" },
  other: { label: "Otros cargos", color: "var(--chart-3)" },
  taxes: { label: "Impuestos", color: "var(--chart-4)" },
  unknown: { label: "Sin desglose", color: "url(#bills-unknown)" },
  credit: { label: "Descuentos", color: "url(#bills-credit)" },
} satisfies ChartConfig;

const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

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

export default function BillsBars({
  months,
  axisWidth,
}: {
  months: { month: string; totals: Totals }[];
  /** The Y axis width; the month buttons start after it. */
  axisWidth: number;
}) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  // The topmost part of each stack gets the rounded corners.
  const stacked = groups
    .filter(([key]) => key !== "credit")
    .map(([key]) => key);
  const top = [...stacked]
    .reverse()
    .find((key) => months.some((m) => m.totals[key] > 0));
  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full"
      aria-hidden="true"
    >
      <BarChart
        data={months.map((m) => ({ month: m.month, ...m.totals }))}
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
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" hide />
        <YAxis
          width={axisWidth}
          tickLine={false}
          axisLine={false}
          tickCount={5}
          tickFormatter={(value: number) => euros.format(value)}
          className="text-xs"
        />
        {groups.map(([key]) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="bill"
            fill={`var(--color-${key})`}
            maxBarSize={48}
            isAnimationActive={!still}
            radius={
              key === "credit" ? [0, 0, 4, 4] : key === top ? [4, 4, 0, 0] : 0
            }
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
