import { ChannelPreference, Preference, PreferenceLevel, SeverityLevelEnum } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
  tags?: string[];
};

export type ListPreferencesArgs = {
  tags?: string[];
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
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
