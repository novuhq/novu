import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { InferZodSchema, ZodSchemaMinimal } from './zod.schema.types';

describe('ZodSchema types', () => {
  const testSchema = z.object({
    foo: z.string().default('bar'),
    bar: z.string().optional(),
  });

  describe('validated data', () => {
    it('should infer the expected properties for the schema', () => {
      type Test = InferZodSchema<typeof testSchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<{
        foo: string;
        bar?: string;
      }>();
    });

    it('should infer the expected properties for a polymorphic schema with properties', () => {
      const polymorphicSchema = z.union([
        z.object({
          foo: z.string().default('bar'),
        }),
        z.object({
          bar: z.number().optional(),
        }),
      ]);

      type Test = InferZodSchema<typeof polymorphicSchema, { validated: true }>;

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
      const emptySchema = z.object({});
      type Test = InferZodSchema<typeof emptySchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<{}>();
    });

    it('should infer to never when the schema is not a ZodSchema', () => {
      type Test = InferZodSchema<string, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should infer to never when the schema is undefined', () => {
      type Test = InferZodSchema<undefined, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should infer to never when the schema is generic', () => {
      type Test = InferZodSchema<ZodSchemaMinimal, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should not compile when a property does not match the expected type', () => {
      type Test = InferZodSchema<typeof testSchema, { validated: true }>;

      // @ts-expect-error - Type 'number' is not assignable to type 'string'.
      expectTypeOf<Test>().toEqualTypeOf<{
        foo: number;
      }>();
    });
  });

  describe('unvalidated data', () => {
    it('should keep the defaulted properties optional', () => {
      type Test = InferZodSchema<typeof testSchema, { validated: false }>;

      expectTypeOf<Test>().toEqualTypeOf<{
        foo?: string;
        bar?: string;
      }>();
    });
  });
});
