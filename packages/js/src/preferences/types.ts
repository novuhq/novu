import { ChannelType, PreferenceLevel } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
};

export type UpdatePreferencesArgs = {
  workflowId?: string;
  enabled: boolean;
  channel: ChannelType;
};
