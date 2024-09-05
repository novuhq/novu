import { ChannelPreference, ChannelTypeEnum } from '@novu/shared';

export type PreferenceChannel = `${ChannelTypeEnum}` | 'workflow';
export type SubscriptionPreferenceRow = {
  channel: PreferenceChannel;
} & ChannelPreference;
