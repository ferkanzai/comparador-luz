import type { ReactNode } from "react";
import type { billLines } from "@/lib/bill-data";

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

export default function CostCategoryLabel({
  category,
  children,
}: {
  category: CostCategory;
  children: ReactNode;
}) {
  return (
    <span className="cost-category-label">
      <span
        className="cost-category-dot"
        data-category={category}
        aria-hidden="true"
      />
      <span>{children}</span>
    </span>
  );
}
