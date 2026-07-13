import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE, StepTypeEnum } from './channel';

describe('STEP_TYPE_TO_CHANNEL_TYPE', () => {
  it('maps StepTypeEnum.SIGNALS to ChannelTypeEnum.SIGNALS', () => {
    expect(StepTypeEnum.SIGNALS).toBe('signals');
    expect(ChannelTypeEnum.SIGNALS).toBe('signals');
    expect(STEP_TYPE_TO_CHANNEL_TYPE.get(StepTypeEnum.SIGNALS)).toBe(ChannelTypeEnum.SIGNALS);
  });
});
