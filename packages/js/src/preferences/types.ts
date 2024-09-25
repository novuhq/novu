import { ChannelPreference, PreferenceLevel, Workflow } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
  tags?: string[];
  critical?: boolean;
};

export type ListPreferencesArgs = {
  tags?: string[];
  critical?: boolean;
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
