import { describe, expect, it } from 'vitest';
import { channelStepSchemas } from './index';

describe('tool channel schemas', () => {
  it('exposes output and result schemas on channelStepSchemas.tool', () => {
    expect(channelStepSchemas.tool).toBeDefined();
    expect(channelStepSchemas.tool.output).toMatchObject({
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
    });
    expect(channelStepSchemas.tool.output.properties).not.toHaveProperty('enabledIntegrations');
    expect(channelStepSchemas.tool.result).toMatchObject({
      type: 'object',
      properties: {},
      required: [],
    });
  });
});
