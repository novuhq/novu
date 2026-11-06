import { describe, expect, it } from 'vitest';
import { chatChannelSchemas } from './chat.schema';
import { toolChannelSchemas } from './tool.schema';

describe('chat and tool channel output schemas', () => {
  it('tool output is required body only', () => {
    expect(toolChannelSchemas.output).toEqual({
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
      additionalProperties: false,
    });
  });

  it('chat output requires a body or a card', () => {
    expect(chatChannelSchemas.output).toMatchObject({
      type: 'object',
      properties: {
        body: { type: 'string' },
        card: { properties: { type: { const: 'card' } } },
      },
      anyOf: [{ required: ['body'] }, { required: ['card'] }],
      additionalProperties: false,
    });
  });
});
