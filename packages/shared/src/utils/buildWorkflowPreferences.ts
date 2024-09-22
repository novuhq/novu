import { DEFAULT_WORKFLOW_PREFERENCES } from '../consts';
import { ChannelTypeEnum, WorkflowPreferencesPartial, WorkflowPreferences } from '../types';

/**
 * Given any partial input of preferences, output a complete preferences object that:
 * - First uses channel-level preferences
 * - Uses the workflow-level preference as defaults for channel preferences if not specified
 * - Lastly, uses the defaults we've defined
 */
export const buildWorkflowPreferences = (
  inputPreferences: WorkflowPreferencesPartial | undefined,
  defaultPreferences: WorkflowPreferences = DEFAULT_WORKFLOW_PREFERENCES
): WorkflowPreferences => {
  if (!inputPreferences) {
    return defaultPreferences;
  }

  return {
    ...defaultPreferences,
    workflow: {
      ...defaultPreferences.workflow,
      ...inputPreferences.workflow,
    },
    channels: {
      ...defaultPreferences.channels,
      ...Object.values(ChannelTypeEnum).reduce(
        (output, channel) => ({
          ...output,
          [channel]: {
            ...defaultPreferences.channels[channel],
            ...inputPreferences?.workflow,
            ...inputPreferences?.channels?.[channel],
          },
        }),
        {} as WorkflowPreferences['channels']
      ),
    },
  };
};
