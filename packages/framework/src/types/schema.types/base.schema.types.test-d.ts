import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { FromSchema, FromSchemaUnvalidated, Schema } from './base.schema.types';

describe('FromSchema', () => {
  it('should infer an unknown record type when a generic schema is provided', () => {
    expectTypeOf<FromSchema<Schema>>().toEqualTypeOf<Record<string, unknown>>();
  });

  it('should not compile when the schema is primitive', () => {
    const primitiveSchema = { type: 'string' } as const;

    // @ts-expect-error - Type '{ type: string; }' is not assignable to type '{ type: "object"; }'.
    type Test = FromSchema<typeof primitiveSchema>;

    expectTypeOf<Test>().toEqualTypeOf<never>();
  });

  it('should infer a Json Schema type', () => {
    const testJsonSchema = {
      type: 'object',
      properties: {
        foo: { type: 'string', default: 'bar' },
        bar: { type: 'string' },
      },
      additionalProperties: false,
    } as const;

    expectTypeOf<FromSchema<typeof testJsonSchema>>().toEqualTypeOf<{ foo: string; bar?: string }>();
  });

  it('should infer a Zod Schema type', () => {
    const testZodSchema = z.object({
      foo: z.string().default('bar'),
      bar: z.string().optional(),
    });

    expectTypeOf<FromSchema<typeof testZodSchema>>().toEqualTypeOf<{ foo: string; bar?: string }>();
  });
});

describe('FromSchemaUnvalidated', () => {
  it('should infer an unknown record type when a generic schema is provided', () => {
    expectTypeOf<FromSchemaUnvalidated<Schema>>().toEqualTypeOf<Record<string, unknown>>();
  });

  it('should not compile when the schema is primitive', () => {
    const primitiveSchema = { type: 'string' } as const;

    // @ts-expect-error - Type '{ type: string; }' is not assignable to type '{ type: "object"; }'.
    type Test = FromSchemaUnvalidated<typeof primitiveSchema>;

    expectTypeOf<Test>().toEqualTypeOf<never>();
  });

  it('should infer a Json Schema type', () => {
    const testJsonSchema = {
      type: 'object',
      properties: {
        foo: { type: 'string', default: 'bar' },
        bar: { type: 'string' },
      },
      additionalProperties: false,
    } as const;

    expectTypeOf<FromSchemaUnvalidated<typeof testJsonSchema>>().toEqualTypeOf<{ foo?: string; bar?: string }>();
  });

  it('should infer a Zod Schema type', () => {
    const testZodSchema = z.object({
      foo: z.string().default('bar'),
      bar: z.string().optional(),
    });

    expectTypeOf<FromSchemaUnvalidated<typeof testZodSchema>>().toEqualTypeOf<{ foo?: string; bar?: string }>();
  });
});
