import { describe, expect, it } from 'vitest';
import { chatChannelSchemas } from './chat.schema';
import { toolChannelSchemas } from './tool.schema';

describe('chat and tool channel output schemas', () => {
  it.each([
    ['chat', chatChannelSchemas],
    ['tool', toolChannelSchemas],
  ] as const)('%s output is required body only', (_name, schemas) => {
    expect(schemas.output).toEqual({
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
      additionalProperties: false,
    });
  });
});
