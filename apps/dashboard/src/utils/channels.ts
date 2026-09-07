import { ChannelTypeEnum, isPreferenceChannelVisibleInUi } from '@novu/shared';

export const CHANNEL_TYPE_TO_STRING: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-App',
  [ChannelTypeEnum.EMAIL]: 'E-Mail',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.TOOL]: 'Tool',
};

/** Whether a channel should appear in dashboard UI when gated behind feature flags. */
export function isChannelVisibleInUi(
  channel: ChannelTypeEnum | string | undefined,
  isToolChannelEnabled: boolean
): boolean {
  if (!channel) {
    return false;
  }

  return channel !== ChannelTypeEnum.TOOL || isToolChannelEnabled;
}

/** Preference UI hides tool regardless of IS_TOOL_CHANNEL_ENABLED; tool steps stay usable elsewhere. */
export const isChannelVisibleInPreferencesUi = isPreferenceChannelVisibleInUi;
