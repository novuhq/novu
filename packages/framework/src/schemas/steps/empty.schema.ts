import { Schema } from '../../types/schema.types';

export const emptySchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;
