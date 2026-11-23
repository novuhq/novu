import type { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';

/**
 * Converts a control Zod schema to the JSON Schema served to the dashboard and stored on steps.
 *
 * The options keep the output identical to what `zod-to-json-schema` produced under Zod v3:
 * - `draft-7` and inlined (non-`$ref`) definitions.
 * - `io: 'input'` keeps fields with a `.default()` optional.
 * - objects that strip unknown keys get `additionalProperties: false`, and discriminated unions use `anyOf`.
 */
export function toControlJsonSchema(schema: z.ZodType): JSONSchemaEntity {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
    io: 'input',
    reused: 'inline',
    cycles: 'throw',
    unrepresentable: 'any',
    override: ({ zodSchema, jsonSchema }) => {
      const { def } = zodSchema._zod;
      if (def.type === 'object' && def.catchall === undefined && jsonSchema.additionalProperties === undefined) {
        jsonSchema.additionalProperties = false;
      }
      // Zod v4 emits `oneOf` for discriminated unions where `zod-to-json-schema` emitted `anyOf`.
      if (def.type === 'union' && jsonSchema.oneOf !== undefined && jsonSchema.anyOf === undefined) {
        jsonSchema.anyOf = jsonSchema.oneOf;
        delete jsonSchema.oneOf;
      }
    },
  }) as JSONSchemaEntity;
}

export const skipZodSchema = z.object({}).catchall(z.unknown()).optional();

export const skipStepUiSchema = {
  group: UiSchemaGroupEnum.SKIP,
  properties: {
    skip: {
      component: UiComponentEnum.QUERY_EDITOR,
    },
  },
} satisfies UiSchema;
