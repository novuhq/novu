import type { InferJsonSchema, JsonSchemaMinimal } from './json.schema.types';
import type { InferZodSchema, ZodSchemaMinimal } from './zod.schema.types';

/**
 * A schema used to validate a JSON object.
 */
export type Schema = JsonSchemaMinimal | ZodSchemaMinimal;

/**
 * Main utility type for schema inference
 *
 * @param T - The Schema to infer the type of.
 * @param Options - Configuration options for the type inference. The `validated` flag determines whether the schema has been validated. If `validated` is true, all properties are required unless specified otherwise. If false, properties with default values are optional.
 */
type InferSchema<T extends Schema, Options extends { validated: boolean }> =
  | InferJsonSchema<T, Options>
  | InferZodSchema<T, Options>;

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
