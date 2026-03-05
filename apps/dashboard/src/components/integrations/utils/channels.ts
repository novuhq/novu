import { ActionIntegrationTypeEnum, ChannelTypeEnum, IntegrationCategoryType } from '@novu/shared';

export const INTEGRATION_CHANNELS = [
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.SMS,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.CHAT,
] as const;

export const INTEGRATION_ACTIONS = [ActionIntegrationTypeEnum.HTTP] as const;

export const ALL_INTEGRATION_CATEGORIES: readonly IntegrationCategoryType[] = [
  ...INTEGRATION_CHANNELS,
  ...INTEGRATION_ACTIONS,
] as const;

export type IntegrationChannel = (typeof INTEGRATION_CHANNELS)[number];
export type IntegrationAction = (typeof INTEGRATION_ACTIONS)[number];
