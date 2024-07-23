import type { JSONSchema, FromSchema as JsonSchemaInfer } from 'json-schema-to-ts';
// eslint-disable-next-line id-length
import z from 'zod';

export type Schema = JSONSchema | z.ZodSchema;

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
    T extends z.ZodSchema
    ? z.infer<T>
    : // All schema types exhaused.
      never;
