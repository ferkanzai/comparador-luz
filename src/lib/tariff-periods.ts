import * as z from "zod";
import {
  tariffSchema,
  today,
  workspaceLimits,
  type Tariff,
  type Workspace,
} from "./domain";

export type PeriodCorrection = {
  start: string;
  end: string;
  moveBoundary?: boolean;
};

export type TariffPeriod = {
  id: string;
  start: string;
  end: string;
  tariff: Tariff;
  current: boolean;
};

export function tariffPeriods(w: Workspace): TariffPeriod[] {
  const current = w.tariffs.find((t) => t.id === w.currentId);
  return [
    ...(current
      ? [
          {
            id: current.id,
            tariff: current,
            start: w.currentSince,
            end: "",
            current: true,
          },
        ]
      : []),
    ...w.history.map((h) => ({ ...h, current: false })),
  ].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) || b.start.localeCompare(a.start),
  );
}

function overlaps(a: TariffPeriod, b: TariffPeriod) {
  // Legacy empty periods don't occupy an interval, but remain visible for repair.
  return (
    a.start &&
    b.start &&
    (!a.end || a.end > a.start) &&
    (!b.end || b.end > b.start) &&
    a.start < (b.end || "9999-12-31") &&
    b.start < (a.end || "9999-12-31")
  );
}

export function periodProblem(
  period: TariffPeriod,
  periods: TariffPeriod[],
): string {
  if (
    !z.iso.date().safeParse(period.start).success ||
    (!period.current && !z.iso.date().safeParse(period.end).success)
  )
    return "Indica las fechas del período.";
  if (period.start > today() || (period.end && period.end > today()))
    return "Las fechas de un contrato registrado no pueden estar en el futuro.";
  if (!period.current && period.end <= period.start)
    return "La fecha final debe ser posterior al inicio.";
  const other = periods.find((p) => p.id !== period.id && overlaps(period, p));
  return other
    ? `El período se solapa con ${other.tariff.name}. Corrige las fechas.`
    : "";
}

export const tariffLimitMessage = `El comparador admite hasta ${workspaceLimits.tariffs} tarifas. Elimina una oferta antes de añadir otra.`;

export function validateChanges(w: Workspace, ids: string[]) {
  if (w.tariffs.length > workspaceLimits.tariffs)
    throw new Error(tariffLimitMessage);
  if (w.history.length > workspaceLimits.history)
    throw new Error(
      `El historial admite hasta ${workspaceLimits.history} períodos. Elimina un registro antes de añadir otro.`,
    );
  if (w.bills.length > workspaceLimits.bills)
    throw new Error(
      `Puedes guardar hasta ${workspaceLimits.bills} facturas. Elimina una antes de añadir otra.`,
    );
  const periods = tariffPeriods(w);
  for (const period of periods.filter((p) => ids.includes(p.id))) {
    const problem = periodProblem(period, periods);
    if (problem) throw new Error(problem);
  }
  return w;
}

export function recordHistorical(
  w: Workspace,
  tariff: Tariff,
  start: string,
  end: string,
): Workspace {
  const entry = {
    id: crypto.randomUUID(),
    start,
    end,
    tariff: structuredClone(tariffSchema.parse(tariff)),
  };
  return validateChanges({ ...w, history: [...w.history, entry] }, [entry.id]);
}

export function recordCurrent(
  w: Workspace,
  tariff: Tariff,
  start: string,
): Workspace {
  const old = tariffPeriods(w).find((p) => p.current);
  const next = {
    ...structuredClone(tariffSchema.parse(tariff)),
    id: crypto.randomUUID(),
  };
  const previous = old
    ? {
        id: crypto.randomUUID(),
        start: old.start,
        end: start,
        tariff: structuredClone(old.tariff),
      }
    : null;
  return validateChanges(
    {
      ...w,
      tariffs: [
        ...w.tariffs.filter((t) => t.id !== w.currentId && t.id !== tariff.id),
        next,
      ],
      currentId: next.id,
      currentSince: start,
      history: previous ? [...w.history, previous] : w.history,
    },
    [next.id, ...(previous ? [previous.id] : [])],
  );
}

export function correctPeriod(
  w: Workspace,
  id: string,
  tariff: Tariff,
  correction: PeriodCorrection,
): Workspace {
  const { start, end, moveBoundary = false } = correction;
  const periods = tariffPeriods(w);
  const original = periods.find((p) => p.id === id);
  if (!original)
    throw new Error("Ese período ya no existe. Vuelve a abrir la tarifa.");
  const changes = new Map<string, TariffPeriod>();
  changes.set(id, {
    ...original,
    tariff: {
      ...structuredClone(tariffSchema.parse(tariff)),
      id: original.tariff.id,
    },
    start,
    end: original.current ? "" : end,
  });
  if (moveBoundary) {
    const previous = periods.filter(
      (p) => p.id !== id && p.end && p.end === original.start,
    );
    const following = periods.filter(
      (p) => p.id !== id && original.end && p.start === original.end,
    );
    if (
      (start !== original.start && previous.length > 1) ||
      (end !== original.end && following.length > 1)
    )
      throw new Error(
        "Hay varias tarifas en ese límite. Corrige sus fechas por separado.",
      );
    if (start !== original.start && previous[0])
      changes.set(previous[0].id, { ...previous[0], end: start });
    if (!original.current && end !== original.end && following[0])
      changes.set(following[0].id, { ...following[0], start: end });
  }
  const current = w.currentId ? changes.get(w.currentId) : undefined;
  return validateChanges(
    {
      ...w,
      tariffs: current
        ? w.tariffs.map((t) => (t.id === w.currentId ? current.tariff : t))
        : w.tariffs,
      currentSince: current?.start ?? w.currentSince,
      history: w.history.map((h) => {
        const changed = changes.get(h.id);
        return changed
          ? {
              id: h.id,
              start: changed.start,
              end: changed.end,
              tariff: changed.tariff,
            }
          : h;
      }),
    },
    [...changes.keys()],
  );
}

export function comparePeriod(w: Workspace, id: string): Workspace {
  const period = tariffPeriods(w).find((p) => p.id === id);
  if (!period) throw new Error("Ese período ya no existe.");
  return validateChanges(
    {
      ...w,
      tariffs: [
        ...w.tariffs,
        { ...structuredClone(period.tariff), id: crypto.randomUUID() },
      ],
    },
    [],
  );
}

export function removePeriod(w: Workspace, id: string): Workspace {
  if (!tariffPeriods(w).some((p) => p.id === id))
    throw new Error("Ese período ya no existe.");
  return id === w.currentId
    ? {
        ...w,
        currentId: null,
        currentSince: "",
        tariffs: w.tariffs.filter((t) => t.id !== id),
      }
    : { ...w, history: w.history.filter((h) => h.id !== id) };
}
