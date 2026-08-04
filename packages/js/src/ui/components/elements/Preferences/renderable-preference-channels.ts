import { ChannelType } from '../../../../types';

/** Channels the Preferences UI can label and icon — exclude tool and unknown keys. */
export const RENDERABLE_PREFERENCE_CHANNELS: ReadonlySet<ChannelType> = new Set([
  ChannelType.IN_APP,
  ChannelType.EMAIL,
  ChannelType.SMS,
  ChannelType.CHAT,
  ChannelType.PUSH,
]);

export function isRenderablePreferenceChannel(channel: string): channel is ChannelType {
  return RENDERABLE_PREFERENCE_CHANNELS.has(channel as ChannelType);
}

export function filterRenderablePreferenceChannels<T extends string>(channels: readonly T[]): T[] {
  return channels.filter((channel) => isRenderablePreferenceChannel(channel));
}
