import { describe, expect, it } from 'vitest';
import { chatChannelSchemas } from './chat.schema';

describe('chat channel schemas', () => {
  it('keeps output schema to required body only', () => {
    expect(chatChannelSchemas.output).toMatchObject({
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
      additionalProperties: false,
    });
    expect(Object.keys(chatChannelSchemas.output.properties)).toEqual(['body']);
    expect(chatChannelSchemas.output.properties).not.toHaveProperty('providerOverrides');
  });

  it('does not change the empty result schema', () => {
    expect(chatChannelSchemas.result).toMatchObject({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    });
  });
});
