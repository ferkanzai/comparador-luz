import { cn } from "@/lib/utils";

/* Mis facturas: tables, panels and the parts its charts share. */

export const panel = "rounded-xl border border-border bg-card";
export const note = "m-0 text-sm-plus text-muted-foreground";
/* Inside the monthly chart panel, notes shrink on a phone. */
export const chartNote = cn(note, "max-[520px]:text-sm/[1.6]");
export const tableScroll = "relative overflow-x-auto";
export const table = "w-full border-collapse text-left text-base/[1.6]";
export const tableCaption =
  "px-5 py-4 text-left text-sm/[1.6] text-muted-foreground";
const cell =
  "border-b border-border px-5 py-4 text-left max-[520px]:px-3.5 max-[520px]:py-3 max-[520px]:text-sm/[1.6]";
export const headCell = cn(
  cell,
  "bg-card text-sm/[1.6] font-medium tracking-[0.8px] text-muted-foreground uppercase",
);
export const bodyCell = cn(
  cell,
  "[tr:last-child>&]:border-b-0 first:whitespace-nowrap first:capitalize",
);
/* A secondary line under a value, smaller inside a table cell. */
export const subLine =
  "block text-sm-plus text-muted-foreground in-[td]:max-w-[250px] in-[td]:text-sm/[1.6] in-[td]:wrap-anywhere";

export const chartLegend =
  "m-0 mt-6 flex list-none flex-wrap gap-x-6 gap-y-3 p-0 text-sm-plus *:flex *:items-center *:gap-2";
export const swatch = "size-4 rounded-sm border border-foreground/[33.3%]";
/* The same swatch, smaller, beside a value in a chart's detail. */
export const detailSwatch = cn(swatch, "size-2.5");
const credit =
  "bg-[image:repeating-linear-gradient(135deg,var(--destructive),var(--destructive)_3px,var(--chart-credit)_3px,var(--chart-credit)_6px)]";
/* Colours of the bill concepts, in bars and swatches. */
export const conceptColor = {
  energy: "bg-chart-1",
  power: "bg-chart-2",
  other: "bg-chart-3",
  taxes: "bg-chart-4",
  unknown:
    "bg-[image:repeating-linear-gradient(45deg,var(--chart-5),var(--chart-5)_3px,var(--chart-5-soft)_3px,var(--chart-5-soft)_6px)]",
  credit,
} as const;

export const interactiveChart =
  "relative grid h-[260px] min-w-[900px] grid-cols-12";
export const chartDrawing =
  "pointer-events-none absolute inset-0 h-[260px] w-full";
export const chartZero =
  "stroke-input stroke-1 [vector-effect:non-scaling-stroke]";
export const monthControl =
  "relative block h-[260px] rounded-md border-0 bg-transparent p-0 text-sm/[1.6] text-muted-foreground hover:bg-primary/[4.3%] focus-visible:-outline-offset-3 focus-visible:shadow-none aria-pressed:bg-primary/[4.3%] aria-pressed:text-foreground";
export const monthAmount = "absolute inset-x-0 top-1 whitespace-nowrap";
export const monthName = "absolute inset-x-0 bottom-0";
const bar = "absolute left-[20%] w-[60%] max-w-12";
export const monthlyStack = cn(
  bar,
  "flex flex-col-reverse overflow-hidden rounded-t-sm *:block *:w-full *:border-t *:border-card",
);
export const monthlyCredit = cn(bar, "rounded-b-sm", credit);

export const chartDetail =
  "mb-5 min-h-[155px] rounded-lg border border-border bg-background p-5";
export const chartDetailHead =
  "flex flex-wrap items-baseline gap-3 [&>strong]:capitalize";
export const chartDetailList =
  "m-0 mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(115px,1fr))] gap-x-5 gap-y-3 max-[520px]:grid-cols-2 [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:font-semibold [&_dd]:tabular-nums [&_dt]:flex [&_dt]:items-center [&_dt]:gap-1.5 [&_dt]:text-sm/[1.6] [&_dt]:text-muted-foreground";
export const chartDetailTotal =
  "border-l border-border pl-4 max-[520px]:border-l-0 max-[520px]:pl-0";
