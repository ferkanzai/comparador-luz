"use client";
import { shortDate, type Tariff, type Workspace } from "@/lib/domain";
import {
  correctPeriod,
  type PeriodCorrection,
  recordCurrent,
  recordHistorical,
  tariffPeriods,
} from "@/lib/tariff-periods";
import TariffForm from "./tariff-form";

export type TariffRecordDraft = { tariff: Tariff; title: string } & (
  | { kind: "historical" | "current"; periodId?: never }
  | { kind: "correction"; periodId: string }
);

export default function TariffRecordForm({
  workspace,
  draft,
  update,
  onClose,
}: {
  workspace: Workspace;
  draft: TariffRecordDraft;
  update: (w: Workspace) => void;
  onClose: () => void;
}) {
  const periods = tariffPeriods(workspace);
  const original = periods.find((p) => p.id === draft.periodId);
  function preview(dates: PeriodCorrection) {
    const { start, end } = dates;
    if (!original || (start === original.start && end === original.end))
      return null;
    try {
      const next = correctPeriod(workspace, original.id, draft.tariff, dates);
      const changed = tariffPeriods(next).filter((p) => {
        const before = periods.find((old) => old.id === p.id);
        return before && (before.start !== p.start || before.end !== p.end);
      });
      return (
        <section className="notice" aria-label="Vista previa de fechas">
          <strong>Así quedarán los períodos</strong>
          {changed.map((p) => (
            <p key={p.id}>
              {p.tariff.name}: {shortDate(p.start)} →{" "}
              {p.current ? "actual" : shortDate(p.end)}
            </p>
          ))}
        </section>
      );
    } catch (error) {
      return (
        <p role="status" className="notice error">
          {error instanceof Error ? error.message : "Revisa las fechas."}
        </p>
      );
    }
  }
  return (
    <TariffForm
      initial={draft.tariff}
      initialProfile={workspace.profile}
      onClose={onClose}
      record={{
        title: draft.title,
        start: original?.start ?? "",
        end:
          draft.kind === "current" || original?.current
            ? undefined
            : (original?.end ?? ""),
        correction: draft.kind === "correction",
        preview: draft.kind === "correction" ? preview : undefined,
        onSave: (tariff, dates) => {
          const { start, end } = dates;
          const next =
            draft.kind === "correction"
              ? correctPeriod(workspace, draft.periodId, tariff, dates)
              : draft.kind === "current"
                ? recordCurrent(workspace, tariff, start)
                : recordHistorical(workspace, tariff, start, end);
          update(next);
          onClose();
        },
      }}
    />
  );
}
