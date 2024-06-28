import { Schema } from '../../types/framework';

export const emptySchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;
