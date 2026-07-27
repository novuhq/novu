import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getWorkflowChannelOrder, isChannelStepType } from './workflow-agent-channels';

describe('getWorkflowChannelOrder', () => {
  it('returns channels in first-appearance workflow step order', () => {
    const order = getWorkflowChannelOrder([
      { type: StepTypeEnum.DELAY },
      { type: StepTypeEnum.CHAT },
      { type: StepTypeEnum.EMAIL },
      { type: StepTypeEnum.CHAT },
      { type: StepTypeEnum.SMS },
      { type: StepTypeEnum.DIGEST },
    ]);

    expect(order).toEqual([ChannelTypeEnum.CHAT, ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS]);
  });

  it('returns an empty list when there are no channel steps', () => {
    expect(getWorkflowChannelOrder([{ type: StepTypeEnum.DELAY }, { type: StepTypeEnum.THROTTLE }])).toEqual([]);
  });

  it('includes tool steps', () => {
    expect(getWorkflowChannelOrder([{ type: StepTypeEnum.TOOL }])).toEqual([ChannelTypeEnum.TOOL]);
  });
});

describe('isChannelStepType', () => {
  it('accepts delivery channel steps and rejects control steps', () => {
    expect(isChannelStepType(StepTypeEnum.EMAIL)).toBe(true);
    expect(isChannelStepType(StepTypeEnum.DELAY)).toBe(false);
  });
});
