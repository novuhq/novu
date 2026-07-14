import { ChannelTypeEnum } from '@novu/shared';

export const CHANNEL_TYPE_TO_STRING: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-App',
  [ChannelTypeEnum.EMAIL]: 'E-Mail',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.SIGNALS]: 'Signals',
};

/** Whether a channel should appear in dashboard UI when gated behind feature flags. */
export function isChannelVisibleInUi(
  channel: ChannelTypeEnum | string | undefined,
  isSignalsChannelEnabled: boolean
): boolean {
  if (!channel) {
    return false;
  }

  return channel !== ChannelTypeEnum.SIGNALS || isSignalsChannelEnabled;
}
