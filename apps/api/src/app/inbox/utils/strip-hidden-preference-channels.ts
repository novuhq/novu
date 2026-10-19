import { IPreferenceChannels, isPreferenceChannelVisibleInUi } from '@novu/shared';
import type { InboxPreference } from './types';

/** Drop preference channels that have no UI surface (e.g. tool) before inbox responses. */
export function stripHiddenPreferenceChannels(channels: IPreferenceChannels): IPreferenceChannels {
  const visibleChannels: IPreferenceChannels = {};

  for (const [channel, enabled] of Object.entries(channels)) {
    if (isPreferenceChannelVisibleInUi(channel)) {
      visibleChannels[channel as keyof IPreferenceChannels] = enabled;
    }
  }

  return visibleChannels;
}

/** Strip UI-hidden channels from an inbox preference response payload. */
export function stripHiddenChannelsFromInboxPreference(preference: InboxPreference): InboxPreference {
  return {
    ...preference,
    channels: stripHiddenPreferenceChannels(preference.channels),
  };
}
