import { today, type Workspace } from "./domain";

export function downloadWorkspace(workspace: Workspace) {
  const blob = new Blob(
    [
      JSON.stringify(
        { exportedAt: new Date().toISOString(), ...workspace },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `luz-en-claro-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
