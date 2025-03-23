import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { FromSchema, FromSchemaUnvalidated, Schema } from './base.schema.types';

describe('FromSchema', () => {
  it('should infer an unknown record type when a generic schema is provided', () => {
    type Test = FromSchema<Schema>;

    expectTypeOf<Test>().toEqualTypeOf<Record<string, unknown>>();
  });

  it('should not compile and infer an unknown record type when the schema is undefined', () => {
    // @ts-expect-error - Type 'undefined' does not satisfy the constraint 'Schema'.
    type Test = FromSchema<undefined>;

    expectTypeOf<Test>().toEqualTypeOf<Record<string, unknown>>();
  });

  it('not compile when the schema is undefined', () => {
    // @ts-expect-error - Type 'undefined' does not satisfy the constraint 'Schema'.
    type Test = FromSchemaUnvalidated<undefined>;

    expectTypeOf<Test>().toEqualTypeOf<Record<string, unknown>>();
  });

  it('should infer an error message type when the schema describes a primitive type', () => {
    const primitiveSchema = { type: 'string' } as const;
    type Test = FromSchema<typeof primitiveSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{
      SchemaError: `Schema must describe an object data structure. Received data type: 'string'`;
    }>();
  });

  it('should infer an error message type when the schema describes an array of primitive types', () => {
    const primitiveSchema = { type: 'array', items: { type: 'string' } } as const;
    type Test = FromSchema<typeof primitiveSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{
      SchemaError: `Schema must describe an object data structure. Received data type: 'string[]'`;
    }>();
  });

  it('should infer an error message type when the schema describes an array of objects', () => {
    const primitiveSchema = {
      type: 'array',
      items: { type: 'object' },
    } as const;
    type Test = FromSchema<typeof primitiveSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{
      SchemaError: `Schema must describe an object data structure. Received data type: '{ [x: string]: unknown; }[]'`;
    }>();
  });

  it('should infer an error message type when the schema describes an array of unknown types', () => {
    const primitiveSchema = {
      type: 'array',
      items: {},
    } as const;
    type Test = FromSchema<typeof primitiveSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{
      SchemaError: `Schema must describe an object data structure. Received data type: 'unknown[]'`;
    }>();
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

    type Test = FromSchema<typeof testJsonSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{ foo: string; bar?: string }>();
  });

  it('should infer a Zod Schema type', () => {
    const testZodSchema = z.object({
      foo: z.string().default('bar'),
      bar: z.string().optional(),
    });

    type Test = FromSchema<typeof testZodSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{ foo: string; bar?: string }>();
  });

  it('should infer a Class Schema type', () => {
    class TestSchema {
      foo: string = 'bar';
      bar?: string;
    }

    type Test = FromSchema<typeof TestSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{ foo: string; bar?: string }>();
  });
});

describe('FromSchemaUnvalidated', () => {
  it('should infer an unknown record type when a generic schema is provided', () => {
    type Test = FromSchemaUnvalidated<Schema>;

    expectTypeOf<Test>().toEqualTypeOf<Record<string, unknown>>();
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

    type Test = FromSchemaUnvalidated<typeof testJsonSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{ foo?: string; bar?: string }>();
  });

  it('should infer a Zod Schema type', () => {
    const testZodSchema = z.object({
      foo: z.string().default('bar'),
      bar: z.string().optional(),
    });

    type Test = FromSchemaUnvalidated<typeof testZodSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{ foo?: string; bar?: string }>();
  });

  it('should infer a Class Schema type', () => {
    class TestClassSchema {
      foo?: string = 'bar';
      bar?: string;
    }

    type Test = FromSchemaUnvalidated<typeof TestClassSchema>;

    expectTypeOf<Test>().toEqualTypeOf<{ foo?: string; bar?: string }>();
  });
});
