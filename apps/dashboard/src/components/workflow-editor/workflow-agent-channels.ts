import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

/** Step types that map 1:1 onto ChannelTypeEnum for agent channel filtering. */
const CHANNEL_STEP_TYPES = new Set<StepTypeEnum>([
  StepTypeEnum.IN_APP,
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.CHAT,
  StepTypeEnum.PUSH,
  StepTypeEnum.TOOL,
]);

export function isChannelStepType(stepType: StepTypeEnum): boolean {
  return CHANNEL_STEP_TYPES.has(stepType);
}

/**
 * Returns workflow channel types in first-appearance order from the workflow steps.
 * Non-channel steps (delay, digest, throttle, http, custom) are ignored.
 */
export function getWorkflowChannelOrder(steps: Array<{ type: StepTypeEnum }>): ChannelTypeEnum[] {
  const order: ChannelTypeEnum[] = [];

  for (const step of steps) {
    if (!isChannelStepType(step.type)) {
      continue;
    }

    const channel = step.type as unknown as ChannelTypeEnum;

    if (!order.includes(channel)) {
      order.push(channel);
    }
  }

  return order;
}

export const WORKFLOW_AGENT_CHANNEL_LABEL: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-app',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.TOOL]: 'Tool',
};
