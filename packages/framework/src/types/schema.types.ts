import type { JSONSchema, FromSchema as JsonSchemaInfer } from 'json-schema-to-ts';
import * as z from 'zod';

export type Schema = JSONSchema | z.ZodSchema;

export type JsonSchema = JSONSchema;

export type FromSchema<T extends Schema> = T extends JSONSchema
  ? JsonSchemaInfer<T>
  : T extends z.ZodSchema
  ? z.infer<T>
  : never;
