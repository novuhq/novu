import { ChannelTypeEnum } from '@novu/shared';

export const WORKFLOW_AGENT_CHANNEL_LABEL: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-app',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.TOOL]: 'Tool',
};
