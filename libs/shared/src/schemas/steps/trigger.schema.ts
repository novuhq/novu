import { Schema } from '../../types/framework';

export const triggerSchema: Schema = {
  type: 'object',
  properties: {
    to: { type: 'string', pattern: '/[0-9a-f]+/' },
    body: { type: 'string' },
  },
  required: ['to', 'body'],
  additionalProperties: false,
};
