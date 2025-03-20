import { describe, expectTypeOf, it } from 'vitest';
import { InferJsonSchema, JsonSchema, JsonSchemaMinimal } from './json.schema.types';

describe('JsonSchema types', () => {
  const testSchema = {
    type: 'object',
    properties: {
      foo: { type: 'string', default: 'bar' },
      bar: { type: 'string' },
    },
    additionalProperties: false,
  } as const satisfies JsonSchema;

  describe('validated data', () => {
    it('should infer the expected properties for an object schema with properties', () => {
      type Test = InferJsonSchema<typeof testSchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<{
        foo: string;
        bar?: string;
      }>();
    });

    it('should infer the expected properties for a polymorphic schema with properties', () => {
      const polymorphicSchema = {
        anyOf: [
          {
            type: 'object',
            properties: {
              foo: { type: 'string', default: 'bar' },
            },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              bar: { type: 'number' },
            },
            additionalProperties: false,
          },
        ],
      } as const satisfies JsonSchema;

      type Test = InferJsonSchema<typeof polymorphicSchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<
        | {
            foo: string;
          }
        | {
            bar?: number;
          }
      >();
    });

    it('should infer an empty object type for an empty object schema', () => {
      const emptySchema = { type: 'object', properties: {}, additionalProperties: false } as const;
      type Test = InferJsonSchema<typeof emptySchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<{}>();
    });

    it('should infer to never when the schema is not a JsonSchema', () => {
      type Test = InferJsonSchema<string, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should infer to never when the schema is undefined', () => {
      type Test = InferJsonSchema<undefined, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should infer to never when the schema is generic', () => {
      type Test = InferJsonSchema<JsonSchemaMinimal, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should not compile when a property does not match the expected type', () => {
      type Test = InferJsonSchema<typeof testSchema, { validated: true }>;

      // @ts-expect-error - Type 'number' is not assignable to type 'string'.
      expectTypeOf<Test>().toEqualTypeOf<{
        foo: number;
      }>();
    });
  });

  describe('unvalidated data', () => {
    it('should keep the defaulted properties optional', () => {
      type Test = InferJsonSchema<typeof testSchema, { validated: false }>;

      expectTypeOf<Test>().toEqualTypeOf<{
        foo?: string;
        bar?: string;
      }>();
    });
  });
});
