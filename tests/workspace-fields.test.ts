import { test } from "node:test";
import assert from "node:assert/strict";
import * as z from "zod";
import {
  billBreakdownSchema,
  billSchema,
  consumptionSchema,
  historySchema,
  profileSchema,
  tariffSchema,
} from "../src/lib/domain";
import {
  billFields,
  breakdownFields,
  consumptionFields,
  historyDateFields,
  profileFields,
  tariffFields,
  type FieldGroup,
} from "../src/lib/workspace-fields";

const groups: [string, FieldGroup, Record<string, z.ZodType>][] = [
  ["profile", profileFields, profileSchema.shape],
  ["tariff", tariffFields, tariffSchema.shape],
  ["bill", billFields, billSchema.shape],
  ["consumption", consumptionFields, consumptionSchema.shape],
  ["breakdown", breakdownFields, billBreakdownSchema.shape],
  ["history", historyDateFields, historySchema.shape],
];

const accepts = (schema: z.ZodType, value: string) =>
  schema.safeParse(value).success;
const url = (length: number) => "https://example.es/".padEnd(length, "x");

test("the storage registry matches the Zod limits for every stored field", () => {
  for (const [group, fields, shape] of groups)
    for (const [name, field] of Object.entries(fields)) {
      const schema = shape[name];
      const at = `${group}.${name}`;
      assert.ok(schema, `${at} has no Zod schema`);
      switch (field.kind) {
        case "decimal":
          assert.ok(accepts(schema, String(field.max)), `${at} max`);
          assert.ok(!accepts(schema, String(field.max + 1)), `${at} max + 1`);
          assert.ok(accepts(schema, String(field.min)), `${at} min`);
          assert.ok(!accepts(schema, String(field.min - 1)), `${at} min - 1`);
          {
            // A required column may still accept an empty form value if it parses to one.
            const empty = schema.safeParse("");
            assert.equal(
              empty.success && empty.data === "",
              !field.required,
              `${at} empty value`,
            );
          }
          break;
        case "date":
          assert.ok(accepts(schema, "2026-01-31"), `${at} date`);
          assert.equal(accepts(schema, ""), !field.required, `${at} empty`);
          break;
        case "enum": {
          const inner =
            schema instanceof z.ZodDefault ? schema.unwrap() : schema;
          assert.ok(inner instanceof z.ZodEnum, `${at} is an enum`);
          assert.deepEqual(inner.options, field.values, `${at} values`);
          break;
        }
        case "text":
          if (field.maxLength === undefined) break;
          assert.ok(
            accepts(
              schema,
              name === "url"
                ? url(field.maxLength)
                : "x".repeat(field.maxLength),
            ),
            `${at} max length`,
          );
          assert.ok(
            !accepts(
              schema,
              name === "url"
                ? url(field.maxLength + 1)
                : "x".repeat(field.maxLength + 1),
            ),
            `${at} max length + 1`,
          );
          break;
        case "boolean":
          assert.ok(schema.safeParse(true).success, `${at} boolean`);
          break;
        default: {
          const unhandled: never = field;
          throw new Error(`Unhandled field: ${JSON.stringify(unhandled)}`);
        }
      }
    }
});
