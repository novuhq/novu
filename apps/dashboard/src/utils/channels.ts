import { ActionIntegrationTypeEnum, ChannelTypeEnum, IntegrationCategoryType } from '@novu/shared';

export const CHANNEL_TYPE_TO_STRING: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-App',
  [ChannelTypeEnum.EMAIL]: 'E-Mail',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
};

export const INTEGRATION_CATEGORY_TO_STRING: Record<IntegrationCategoryType, string> = {
  ...CHANNEL_TYPE_TO_STRING,
  [ActionIntegrationTypeEnum.HTTP]: 'HTTP',
};
