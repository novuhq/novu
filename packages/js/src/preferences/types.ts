import { ChannelPreference, Preference, PreferenceLevel, SeverityLevelEnum, WorkflowCriticalityEnum } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
  tags?: string[];
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
  criticality?: WorkflowCriticalityEnum;
};

export type ListPreferencesArgs = {
  tags?: string[];
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
  criticality?: WorkflowCriticalityEnum;
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
