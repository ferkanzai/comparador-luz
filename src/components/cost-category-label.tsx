import type { ReactNode } from "react";
import type { billLines } from "@/lib/bill-data";
import { cn } from "@/lib/utils";

export type CostCategory = "energy" | "power" | "other" | "taxes";

export const billLineCategories: Record<
  (typeof billLines)[number][0],
  CostCategory
> = {
  energy: "energy",
  power: "power",
  social: "other",
  snoee: "other",
  meter: "other",
  services: "other",
  electricityTax: "taxes",
  vat: "taxes",
  servicesVat: "taxes",
};

const dotColours: Record<CostCategory, string> = {
  energy: "bg-chart-1",
  power: "bg-chart-2",
  other: "bg-chart-3",
  taxes: "bg-chart-4",
};

export default function CostCategoryLabel({
  category,
  children,
  className,
}: {
  category: CostCategory;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn("size-2 shrink-0 rounded-full", dotColours[category])}
        aria-hidden="true"
      />
      <span>{children}</span>
    </span>
  );
}
