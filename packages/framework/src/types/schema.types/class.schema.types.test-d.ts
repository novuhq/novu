import { describe, expectTypeOf, it } from 'vitest';
import { InferClassValidatorSchema, ClassValidatorSchema } from './class.schema.types';

describe('ClassSchema types', () => {
  class TestSchema {
    foo: string = 'bar';
    bar?: string;
  }

  describe('validated data', () => {
    it('should infer the expected properties for the schema', () => {
      type Test = InferClassValidatorSchema<typeof TestSchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<{
        foo: string;
        bar?: string;
      }>();
    });

    it('should infer an empty object type for an empty object schema', () => {
      class EmptySchema {}
      type Test = InferClassValidatorSchema<typeof EmptySchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<{}>();
    });

    it('should infer to never when the schema is not a ClassSchema', () => {
      type Test = InferClassValidatorSchema<string, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should infer to never when the schema is undefined', () => {
      type Test = InferClassValidatorSchema<undefined, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should infer to never when the schema is generic', () => {
      type Test = InferClassValidatorSchema<ClassValidatorSchema, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });

    it('should not compile when a property does not match the expected type', () => {
      type Test = InferClassValidatorSchema<typeof TestSchema, { validated: true }>;

      // @ts-expect-error - Type 'number' is not assignable to type 'string'.
      expectTypeOf<Test>().toEqualTypeOf<{
        foo: number;
      }>();
    });

    it('should infer to never when the schema includes a constructor', () => {
      class TestSchemaWithConstructor {
        constructor(public foo: string) {}

        bar?: string;
      }
      type Test = InferClassValidatorSchema<typeof TestSchemaWithConstructor, { validated: true }>;

      expectTypeOf<Test>().toEqualTypeOf<never>();
    });
  });

  describe('unvalidated data', () => {
    /**
     * TODO: Support accessing defaulted class properties when Typescript supports it.
     */
    it.skip('should keep the defaulted properties optional', () => {
      type Test = InferClassValidatorSchema<typeof TestSchema, { validated: false }>;

      // @ts-expect-error - Type 'undefined' is not assignable to type 'string'.
      expectTypeOf<Test>().toEqualTypeOf<{
        foo?: string;
        bar?: string;
      }>();
    });
  });
});
