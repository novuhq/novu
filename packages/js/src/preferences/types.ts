import {
  ChannelPreference,
  Preference,
  PreferenceLevel,
  SeverityLevelEnum,
  WeeklySchedule,
  WorkflowCriticalityEnum,
} from '../types';

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

export type UpdateScheduleArgs = {
  isEnabled?: boolean;
  weeklySchedule?: WeeklySchedule;
};
