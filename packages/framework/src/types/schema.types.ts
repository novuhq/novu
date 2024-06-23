import { JSONSchema, FromSchema as JsonSchemaInfer } from 'json-schema-to-ts';
import { ZodSchema, infer as ZodInfer } from 'zod';

export type Schema = JSONSchema | ZodSchema;

export type JsonSchema = JSONSchema;

export type FromSchema<T extends Schema> = T extends JSONSchema
  ? JsonSchemaInfer<T>
  : T extends ZodSchema
  ? ZodInfer<T>
  : never;
