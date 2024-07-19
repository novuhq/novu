import { ChannelPreference, ChannelType, PreferenceLevel } from '../types';

export type FetchPreferencesArgs = {
  level?: PreferenceLevel;
};

export type UpdatePreferencesArgs = {
  workflowId?: string;
  channelPreferences: ChannelPreference;
};
