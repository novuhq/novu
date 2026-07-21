import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE, StepTypeEnum } from './channel';

describe('STEP_TYPE_TO_CHANNEL_TYPE', () => {
  it('maps StepTypeEnum.TOOL to ChannelTypeEnum.TOOL', () => {
    expect(StepTypeEnum.TOOL).toBe('tool');
    expect(ChannelTypeEnum.TOOL).toBe('tool');
    expect(STEP_TYPE_TO_CHANNEL_TYPE.get(StepTypeEnum.TOOL)).toBe(ChannelTypeEnum.TOOL);
  });
});
