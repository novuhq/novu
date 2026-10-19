import type { JsonSchema } from '../../types/schema.types';

/**
 * A permissive schema for untyped providers to use.
 *
 * This schema is used to allow providers to return any output without
 * having to define a schema for each provider.
 *
 * Over time, this schema will be replaced with a more strict schema per provider.
 */
export const genericProviderSchemas = {
  output: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: true,
  } as const,
} satisfies { output: JsonSchema };
