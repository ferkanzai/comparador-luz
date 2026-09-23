"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

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
        className="chart-scroll"
        role="region"
        aria-label={`${label}. Desplázate para ver todos los meses.`}
        tabIndex={0}
      >
        {children}
      </div>
      {overflows && (
        <p className="small muted chart-scroll-hint" aria-hidden="true">
          Desliza el gráfico para ver todos los meses ↔
        </p>
      )}
    </>
  );
}
