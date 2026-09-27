import { test } from "node:test";
import assert from "node:assert/strict";
import { tabFromParam, tabSearch } from "../src/lib/workspace-tab";

test("reads the tab from the URL, falling back to the comparador", () => {
  assert.equal(tabFromParam(null), "compare");
  assert.equal(tabFromParam("tarifas"), "history");
  assert.equal(tabFromParam("facturas"), "bills");
  assert.equal(tabFromParam("bills"), "compare");
  assert.equal(tabFromParam(""), "compare");
});

test("writes the tab into the URL, keeping other params", () => {
  assert.equal(tabSearch("bills", ""), "?tab=facturas");
  assert.equal(tabSearch("history", "?tab=facturas&x=1"), "?tab=tarifas&x=1");
  assert.equal(tabSearch("compare", "?tab=facturas"), "");
  assert.equal(tabSearch("compare", "?tab=facturas&x=1"), "?x=1");
});
