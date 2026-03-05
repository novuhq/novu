import { ChannelTypeEnum } from '@novu/shared';

export const INTEGRATION_CHANNELS = [
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.SMS,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.CHAT,
] as const;

export const ALL_INTEGRATION_CATEGORIES: readonly ChannelTypeEnum[] = [...INTEGRATION_CHANNELS] as const;

export type IntegrationChannel = (typeof INTEGRATION_CHANNELS)[number];
