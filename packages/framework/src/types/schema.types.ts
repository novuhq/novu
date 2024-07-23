import type { JSONSchema, FromSchema as JsonSchemaInfer } from 'json-schema-to-ts';
import zod from 'zod';

export type Schema = JSONSchema | zod.ZodSchema;

export type JsonSchema = JSONSchema;

export type FromSchema<T extends Schema> =
  /*
   * Handle each Schema's type inference individually until
   * all Schema types are exhausted.
   */

  // JSONSchema
  T extends JSONSchema
    ? JsonSchemaInfer<T>
    : // ZodSchema
    T extends zod.ZodSchema
    ? zod.infer<T>
    : // All schema types exhausted.
      never;
