import { describe, expect, it } from 'vitest';
import { z as zV4 } from 'zod';
import { z as zV3 } from 'zod/v3';
import type { Schema } from '../types/schema.types';
import { transformSchema, validateData } from './base.validator';

/**
 * Customers bring their own `zod` (an optional peer dependency), so the same workflow schema can be
 * built with Zod v3 or Zod v4. Both must validate the same way and produce the same JSON Schema.
 */
const buildSchemas = (z: typeof zV3 | typeof zV4) => ({
  object: (z as typeof zV3).object({
    name: (z as typeof zV3).string().min(1),
    age: (z as typeof zV3).number().int().min(1).optional(),
    role: (z as typeof zV3).enum(['admin', 'member']).default('member'),
    nickname: (z as typeof zV3).string().nullable().optional(),
    nested: (z as typeof zV3)
      .object({ flag: (z as typeof zV3).boolean() })
      .strict()
      .optional(),
    meta: (z as typeof zV3).object({}).passthrough().optional(),
    tags: (z as typeof zV3)
      .array((z as typeof zV3).string())
      .max(5)
      .optional(),
  }),
  discriminatedUnion: (z as typeof zV3).object({
    element: (z as typeof zV3).discriminatedUnion('type', [
      (z as typeof zV3).object({ type: (z as typeof zV3).literal('text'), text: (z as typeof zV3).string() }),
      (z as typeof zV3).object({ type: (z as typeof zV3).literal('count'), count: (z as typeof zV3).number() }),
    ]),
  }),
});

/**
 * `.passthrough()` objects allow any extra property: `zod-to-json-schema` writes that as
 * `additionalProperties: true` and Zod v4 as `additionalProperties: {}`, which JSON Schema treats the same.
 */
const normalizeOpenObjects = (jsonSchema: unknown): unknown =>
  JSON.parse(JSON.stringify(jsonSchema), (key, value) =>
    key === 'additionalProperties' && value === true ? {} : value
  );

const v3Schemas = buildSchemas(zV3);
const v4Schemas = buildSchemas(zV4);

describe('ZodValidator with Zod v3 and v4 schemas', () => {
  it('should produce the same JSON Schema for a Zod v4 schema as for its Zod v3 equivalent', async () => {
    for (const key of Object.keys(v3Schemas) as (keyof typeof v3Schemas)[]) {
      const fromV3 = await transformSchema(v3Schemas[key] as unknown as Schema);
      const fromV4 = await transformSchema(v4Schemas[key] as unknown as Schema);

      expect(fromV3).not.toEqual({ $schema: 'http://json-schema.org/draft-07/schema#' });
      expect(normalizeOpenObjects(fromV4)).toEqual(normalizeOpenObjects(fromV3));
    }
  });

  it('should keep `.default()` fields optional and strip-mode objects closed in the Zod v4 JSON Schema', async () => {
    const jsonSchema = await transformSchema(v4Schemas.object as unknown as Schema);

    expect(jsonSchema).toMatchObject({
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        role: { type: 'string', enum: ['admin', 'member'], default: 'member' },
        meta: { type: 'object', additionalProperties: {} },
      },
    });
  });

  it('should validate data the same way with Zod v3 and Zod v4 schemas', async () => {
    const valid = { name: 'Jane', tags: ['a'] };
    const invalid = { name: '', tags: ['a', 'b', 'c', 'd', 'e', 'f'] };

    for (const schemas of [v3Schemas, v4Schemas]) {
      await expect(validateData(schemas.object as unknown as Schema, valid)).resolves.toEqual({
        success: true,
        data: { name: 'Jane', tags: ['a'], role: 'member' },
      });

      const result = await validateData(schemas.object as unknown as Schema, invalid);
      expect(result.success).toBe(false);
      expect(!result.success && result.errors.map((error) => error.path)).toEqual(['/name', '/tags']);
    }
  });
});
