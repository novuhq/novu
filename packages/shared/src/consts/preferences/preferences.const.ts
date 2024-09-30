import { ChannelPreference, WorkflowPreference, WorkflowPreferences } from '../../types';

export const PREFERENCE_DEFAULT_VALUE: WorkflowPreference['enabled'] = true;
export const PREFERENCE_DEFAULT_READ_ONLY: WorkflowPreference['readOnly'] = false;

export const WORKFLOW_PREFERENCE_DEFAULT: WorkflowPreference = {
  enabled: PREFERENCE_DEFAULT_VALUE,
  readOnly: PREFERENCE_DEFAULT_READ_ONLY,
};

export const CHANNEL_PREFERENCE_DEFAULT: ChannelPreference = {
  enabled: PREFERENCE_DEFAULT_VALUE,
};

export const DEFAULT_WORKFLOW_PREFERENCES: WorkflowPreferences = {
  all: WORKFLOW_PREFERENCE_DEFAULT,
  channels: {
    in_app: CHANNEL_PREFERENCE_DEFAULT,
    sms: CHANNEL_PREFERENCE_DEFAULT,
    email: CHANNEL_PREFERENCE_DEFAULT,
    push: CHANNEL_PREFERENCE_DEFAULT,
    chat: CHANNEL_PREFERENCE_DEFAULT,
  },
};
