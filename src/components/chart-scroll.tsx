"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { chartNote } from "./bill-styles";

export const chartScroll = "my-5 overflow-x-auto p-1.5";

export default function ChartScroll({
  label,
  ref,
  children,
}: {
  label: string;
  ref?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const own = useRef<HTMLDivElement>(null);
  const node = ref ?? own;
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const chart = node.current;
    if (!chart) return;
    const measure = () => setOverflows(chart.scrollWidth > chart.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(chart);
    measure();
    return () => observer.disconnect();
  }, [node]);
  return (
    <>
      <div
        ref={node}
        className={chartScroll}
        role="region"
        aria-label={`${label}. Desplázate para ver todos los meses.`}
        tabIndex={0}
      >
        {children}
      </div>
      {overflows && (
        <p className={cn(chartNote, "-mt-3 mb-4")} aria-hidden="true">
          Desliza el gráfico para ver todos los meses ↔
        </p>
      )}
    </>
  );
}
