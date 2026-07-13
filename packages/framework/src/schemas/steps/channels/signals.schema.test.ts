import { describe, expect, it } from 'vitest';
import { channelStepSchemas } from './index';

describe('signals channel schemas', () => {
  it('exposes output and result schemas on channelStepSchemas.signals', () => {
    expect(channelStepSchemas.signals).toBeDefined();
    expect(channelStepSchemas.signals.output).toMatchObject({
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
    });
    expect(channelStepSchemas.signals.result).toMatchObject({
      type: 'object',
      properties: {},
      required: [],
    });
  });
});
