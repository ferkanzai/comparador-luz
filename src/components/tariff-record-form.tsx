"use client";
import { shortDate, type Tariff, type Workspace } from "@/lib/domain";
import {
  correctPeriod,
  type PeriodCorrection,
  tariffPeriods,
} from "@/lib/tariff-periods";
import TariffForm from "./tariff-form";
import { commands, type WorkspaceCommand } from "@/lib/workspace-commands";
import { Alert } from "@/components/ui/alert";

export type TariffRecordDraft = { tariff: Tariff; title: string } & (
  | { kind: "historical" | "current"; periodId?: never }
  | { kind: "correction"; periodId: string }
);

export default function TariffRecordForm({
  workspace,
  draft,
  run,
  onClose,
  onSaved = onClose,
}: {
  workspace: Workspace;
  draft: TariffRecordDraft;
  run: (command: WorkspaceCommand) => void;
  /** Cancel, X or Escape. */
  onClose: () => void;
  /** After saving; closes like `onClose` unless told otherwise. */
  onSaved?: () => void;
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
        <Alert aria-label="Vista previa de fechas" role="region">
          <strong>Así quedarán los períodos</strong>
          {changed.map((p) => (
            <p key={p.id}>
              {p.tariff.name}: {shortDate(p.start)} →{" "}
              {p.current ? "actual" : shortDate(p.end)}
            </p>
          ))}
        </Alert>
      );
    } catch (error) {
      return (
        <Alert variant="destructive" role="status">
          {error instanceof Error ? error.message : "Revisa las fechas."}
        </Alert>
      );
    }
  }
  return (
    <TariffForm
      initial={draft.tariff}
      initialProfile={workspace.profile}
      onClose={onClose}
      mode={{
        kind: "record",
        title: draft.title,
        start: original?.start ?? "",
        end:
          draft.kind === "current" || original?.current
            ? undefined
            : (original?.end ?? ""),
        preview: draft.kind === "correction" ? preview : undefined,
        onSave: (tariff, dates) => {
          const { start, end } = dates;
          run(
            draft.kind === "correction"
              ? commands.correctPeriod(draft.periodId, tariff, dates)
              : draft.kind === "current"
                ? commands.recordCurrent(tariff, start)
                : commands.recordHistorical(tariff, start, end),
          );
          onSaved();
        },
      }}
    />
  );
}
