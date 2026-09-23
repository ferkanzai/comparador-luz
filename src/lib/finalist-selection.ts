import type { Workspace } from "./domain";

// Recording a new current contract replaces both the promoted offer and the
// former contract with a fresh id, so selections of either follow the new one.
export function carryFinalists(
  ids: string[],
  before: Workspace,
  after: Workspace,
): string[] {
  const exists = (id: string) => after.tariffs.some((t) => t.id === id);
  const replaced = after.currentId !== before.currentId && after.currentId;
  const carried = ids.flatMap((id) =>
    exists(id) ? [id] : replaced ? [replaced] : [],
  );
  return [...new Set(carried)];
}
