import { DEFAULT_WORKFLOW_PREFERENCES } from '../consts';
import { IPreferenceChannels } from '../entities/subscriber-preference';
import { ChannelTypeEnum, WorkflowPreference, WorkflowPreferences, WorkflowPreferencesPartial } from '../types';

/**
 * Given any partial input of preferences, output a complete preferences object that:
 * - First uses channel-level preferences
 * - Uses the workflow-level preference as defaults for channel preferences if not specified
 * - Lastly, uses the defaults we've defined
 */
export const buildWorkflowPreferences = (
  inputPreferences: WorkflowPreferencesPartial | undefined | null,
  defaultPreferences: WorkflowPreferences = DEFAULT_WORKFLOW_PREFERENCES
): WorkflowPreferences => {
  if (!inputPreferences) {
    return defaultPreferences;
  }

  const defaultChannelPreference = {
    // Only use the workflow-level enabled preference if defined
    ...(inputPreferences?.all?.enabled !== undefined ? { enabled: inputPreferences.all.enabled } : {}),
  };

  return {
    ...defaultPreferences,
    all: {
      ...defaultPreferences.all,
      // DeepPartial loosens json-logic types; assert back to the concrete workflow preference before merging.
      ...(inputPreferences.all as WorkflowPreference),
    },
    channels: {
      ...defaultPreferences.channels,
      ...Object.values(ChannelTypeEnum).reduce(
        (output, channel) => ({
          ...output,
          [channel]: {
            ...defaultPreferences.channels[channel],
            ...defaultChannelPreference,
            ...inputPreferences?.channels?.[channel],
          },
        }),
        {} as WorkflowPreferences['channels']
      ),
    },
  };
};

/**
 * Given a `critical` flag and a `IPreferenceChannels` object, build a `WorkflowPreferences` object
 *
 * @deprecated use `buildWorkflowPreferences` instead
 */
export const buildWorkflowPreferencesFromPreferenceChannels = (
  critical: boolean = false,
  preferenceChannels: IPreferenceChannels = {}
): WorkflowPreferences => {
  return buildWorkflowPreferences({
    all: { enabled: true, readOnly: critical },
    channels: Object.entries(preferenceChannels).reduce(
      (output, [channel, value]) => ({
        ...output,
        [channel as ChannelTypeEnum]: {
          enabled: value,
        },
      }),
      {} as WorkflowPreferences['channels']
    ),
  });
};
