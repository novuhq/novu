// Main JSON Schema validation
import { z } from 'zod';

const jsonSchemaType = z.union([
  z.literal('string'),
  z.literal('number'),
  z.literal('object'),
  z.literal('array'),
  z.literal('boolean'),
  z.literal('null'),
]);

export const jsonSchemaProperties = z.object({
  type: jsonSchemaType,
  properties: z.record(z.lazy(() => jsonschemaZodValidator)).optional(), // Allow nested schemas
  items: z.lazy(() => jsonschemaZodValidator).optional(), // For arrays, this can be a schema or a reference
  required: z.array(z.string()).optional(),
  enum: z.array(z.string()).optional(),
  additionalProperties: z.union([z.boolean(), z.lazy(() => jsonschemaZodValidator)]).optional(), // Allow nested additional properties
});

// @ts-ignore
export const jsonschemaZodValidator = z.object({
  $schema: z.string().optional(), // Optional $schema property
  ...jsonSchemaProperties.shape, // Spread the properties schema
});
export type JsonSchemaDto = z.infer<typeof jsonschemaZodValidator>;
