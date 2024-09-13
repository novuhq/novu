import { ChannelPreference, WorkflowChannelPreferences } from '../../types';

export const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE: ChannelPreference['defaultValue'] = true;
export const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY: ChannelPreference['readOnly'] = false;

export const WORKFLOW_CHANNEL_PREFERENCE_DEFAULT: ChannelPreference = {
  defaultValue: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_VALUE,
  readOnly: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT_READ_ONLY,
};

export const DEFAULT_WORKFLOW_PREFERENCES: WorkflowChannelPreferences = {
  workflow: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT,
  channels: {
    in_app: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT,
    sms: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT,
    email: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT,
    push: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT,
    chat: WORKFLOW_CHANNEL_PREFERENCE_DEFAULT,
  },
};
