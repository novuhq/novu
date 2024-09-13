import { IncompleteWorkflowChannelPreferences, WorkflowChannelPreferences } from '../types';

const PREFERENCE_DEFAULT_READ_ONLY = true;
const PREFERENCE_DEFAULT_VALUE = false;
export const DEFAULT_WORKFLOW_PREFERENCES: WorkflowChannelPreferences = {
  workflow: {
    defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
    readOnly: PREFERENCE_DEFAULT_VALUE,
  },
  channels: {
    in_app: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    sms: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    email: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    push: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    chat: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
  },
};

export const buildWorkflowChannelPreferences = (
  inputPreferences: IncompleteWorkflowChannelPreferences
): WorkflowChannelPreferences => {
  return DEFAULT_WORKFLOW_PREFERENCES;
};
