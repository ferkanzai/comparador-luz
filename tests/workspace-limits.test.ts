import { test } from "node:test";
import assert from "node:assert/strict";
import { maxWorkspaceRequestBytes, workspaceSchema } from "../src/lib/domain";
import { maxCountWorkspace } from "./fixtures/max-workspace";

test("a workspace at every list maximum fits the save request limit", () => {
  const workspace = maxCountWorkspace();
  assert.equal(workspaceSchema.safeParse(workspace).success, true);
  const bytes = Buffer.byteLength(JSON.stringify({ data: workspace }));
  assert.ok(
    bytes < maxWorkspaceRequestBytes * 0.75,
    `${bytes} bytes leaves too little margin under ${maxWorkspaceRequestBytes}`,
  );
});
