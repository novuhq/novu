import { ChannelPreference, ChannelType, PreferenceLevel, Workflow } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
};

export type UpdatePreferencesArgs = {
  workflowId?: string;
  channelPreferences: ChannelPreference;
  preference?: {
    level: PreferenceLevel;
    enabled: boolean;
    channels: ChannelPreference;
    workflow?: Workflow;
  };
};
