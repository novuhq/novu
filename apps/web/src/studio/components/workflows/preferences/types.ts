import { ChannelTypeEnum, ChannelPreference } from '@novu/shared';

export type PreferenceChannelName = `${ChannelTypeEnum}` | 'all';
export type SubscriptionPreferenceRow = {
  channel: PreferenceChannelName;
  onChange: (channel: PreferenceChannelName, key: string, value: boolean) => void;
  disabled?: boolean;
} & ChannelPreference;

export type WorkflowGeneralSettings = {
  workflowId: string;
  name: string;
  description: string;
  tags: string[];
};
