import { describe, expectTypeOf, it } from 'vitest';
import { InferJsonSchema, JsonSchema } from './json.schema.types';

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
    it('should compile when the expected properties are provided', () => {
      expectTypeOf<InferJsonSchema<typeof testSchema, { validated: true }>>().toEqualTypeOf<{
        foo: string;
        bar?: string;
      }>();
    });

    it('should not compile when the schema is not a JsonSchema', () => {
      expectTypeOf<InferJsonSchema<string, { validated: true }>>().toEqualTypeOf<never>();
    });

    it('should not compile when the schema is generic', () => {
      expectTypeOf<InferJsonSchema<{}, { validated: true }>>().toEqualTypeOf<never>();
    });

    it('should not compile when the schema is a primitive JsonSchema', () => {
      const testPrimitiveSchema = { type: 'string' } as const;

      expectTypeOf<InferJsonSchema<typeof testPrimitiveSchema, { validated: true }>>().toEqualTypeOf<never>();
    });

    it('should not compile when a property does not match the expected type', () => {
      // @ts-expect-error - Type 'number' is not assignable to type 'string'.
      expectTypeOf<InferJsonSchema<typeof testSchema, { validated: true }>>().toEqualTypeOf<{
        foo: number;
      }>();
    });
  });

  describe('unvalidated data', () => {
    it('should keep the defaulted properties optional', () => {
      expectTypeOf<InferJsonSchema<typeof testSchema, { validated: false }>>().toEqualTypeOf<{
        foo?: string;
        bar?: string;
      }>();
    });
  });
});
