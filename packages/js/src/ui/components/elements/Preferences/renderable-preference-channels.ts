import { ChannelType } from '../../../../types';

export type RenderablePreferenceChannel = Exclude<ChannelType, ChannelType.TOOL>;

/** Channels the Preferences UI can label and icon — exclude tool and unknown keys. */
export const RENDERABLE_PREFERENCE_CHANNELS: ReadonlySet<RenderablePreferenceChannel> = new Set([
  ChannelType.IN_APP,
  ChannelType.EMAIL,
  ChannelType.SMS,
  ChannelType.CHAT,
  ChannelType.PUSH,
]);

export function isRenderablePreferenceChannel(channel: string): channel is RenderablePreferenceChannel {
  return RENDERABLE_PREFERENCE_CHANNELS.has(channel as RenderablePreferenceChannel);
}
