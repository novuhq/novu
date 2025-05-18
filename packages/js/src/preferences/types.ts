import { ChannelPreference, Preference, PreferenceLevel, Workflow } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
  tags?: string[];
};

export type ListPreferencesArgs = {
  tags?: string[];
};

export type BasePreferenceArgs = {
  workflowId: string;
  channels: ChannelPreference;
};

export type InstancePreferenceArgs = {
  preference: Preference;
  channels: ChannelPreference;
};

export type UpdatePreferenceArgs = BasePreferenceArgs | InstancePreferenceArgs;
