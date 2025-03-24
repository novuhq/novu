import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { InferZodSchema, ZodSchemaMinimal } from './zod.schema.types';

describe('ZodSchema', () => {
  const testSchema = z.object({
    foo: z.string().default('bar'),
    bar: z.string().optional(),
  });

  describe('validated data', () => {
    it('should compile when the expected properties are provided', () => {
      expectTypeOf<InferZodSchema<typeof testSchema, { validated: true }>>().toEqualTypeOf<{
        foo: string;
        bar?: string;
      }>();
    });

    it('should not compile when the schema is not a ZodSchema', () => {
      expectTypeOf<InferZodSchema<string, { validated: true }>>().toEqualTypeOf<never>();
    });

    it('should not compile when the schema is generic', () => {
      expectTypeOf<InferZodSchema<ZodSchemaMinimal, { validated: true }>>().toEqualTypeOf<never>();
    });

    it('should not compile when the schema is a primitive ZodSchema', () => {
      const testPrimitiveSchema = z.string();

      expectTypeOf<InferZodSchema<typeof testPrimitiveSchema, { validated: true }>>().toEqualTypeOf<never>();
    });

    it('should not compile when a property does not match the expected type', () => {
      // @ts-expect-error - Type 'number' is not assignable to type 'string'.
      expectTypeOf<InferZodSchema<typeof testSchema, { validated: true }>>().toEqualTypeOf<{
        foo: number;
      }>();
    });
  });

  describe('unvalidated data', () => {
    it('should keep the defaulted properties optional', () => {
      expectTypeOf<InferZodSchema<typeof testSchema, { validated: false }>>().toEqualTypeOf<{
        foo?: string;
        bar?: string;
      }>();
    });
  });
});
