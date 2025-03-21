import type { InferJsonSchema, JsonSchemaMinimal } from './json.schema.types';
import type { InferZodSchema, ZodSchemaMinimal } from './zod.schema.types';
import type { InferClassValidatorSchema, ClassValidatorSchema } from './class.schema.types';
import type { Stringify } from '../util.types';

/**
 * A schema used to validate a JSON object.
 */
export type Schema = JsonSchemaMinimal | ZodSchemaMinimal | ClassValidatorSchema;

/**
 * Main utility type for schema inference
 *
 * @param T - The Schema to infer the type of.
 * @param Options - Configuration options for the type inference. The `validated` flag determines whether the schema has been validated. If `validated` is true, all properties are required unless specified otherwise. If false, properties with default values are optional.
 */
type InferSchema<T extends Schema, Options extends { validated: boolean }> =
  | InferJsonSchema<T, Options>
  | InferClassValidatorSchema<T, Options>
  | InferZodSchema<T, Options>
  | never extends infer U
  ? /*
     * Use a distributive conditional type to detect if all inferred types are `never`.
     * When all inferred types are `never`, return an unknown record.
     *
     * Each schema inference must return `never` type when:
     * - The schema is generic (i.e. not a concrete schema type)
     * - The schema is not supported (i.e. tried to specify `string` as the schema type)
     * - The schema is undefined
     *
     * @see - https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
     */
    [U] extends [never]
    ? // When all inferred types are `never`, return an unknown record.
      Record<string, unknown>
    : // The type inference did not return `never`. Ensure the inferred type is a record type, as only objects are supported.
      U extends Record<string, unknown>
      ? // Got a record type, return it.
        U
      : // The schema describes a non-record type, return an error message.
        {
          SchemaError: `Schema must describe an object data structure. Received data type: '${Stringify<U>}'`;
        }
  : never;

/**
 * Infer the type of a Schema for unvalidated data.
 *
 * The resulting type has default properties set to optional,
 * reflecting the fact that the data is unvalidated and has
 * not had default properties set.
 *
 * @example
 * ```ts
 * type MySchema = FromSchemaUnvalidated<typeof mySchema>;
 * ```
 */
export type FromSchemaUnvalidated<T extends Schema> = InferSchema<T, { validated: false }>;

/**
 * Infer the type of a Schema for validated data.
 *
 * The resulting type has default properties set to required,
 * reflecting the fact that the data has been validated and
 * default properties have been set.
 *
 * @example
 * ```ts
 * type MySchema = FromSchema<typeof mySchema>;
 * ```
 */
export type FromSchema<T extends Schema> = InferSchema<T, { validated: true }>;
