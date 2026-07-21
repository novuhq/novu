import { IPreferenceChannels, WorkflowPreferences } from '@novu/shared';

export const filteredPreference = (preferences: IPreferenceChannels, filterKeys: string[]): IPreferenceChannels =>
  Object.entries(preferences).reduce(
    (obj, [key, value]) => (filterKeys.includes(key) ? { ...obj, [key]: value } : obj),
    {}
  );

export function buildDefaultPreferenceChannels({
  isToolChannelEnabled,
}: {
  isToolChannelEnabled: boolean;
}): IPreferenceChannels {
  return {
    email: true,
    sms: true,
    in_app: true,
    chat: true,
    push: true,
    ...(isToolChannelEnabled ? { tool: true } : {}),
  };
}

/**
 * Omits feature-flagged preference channels from API responses when the flag is off.
 * Currently gates `tool` behind `IS_TOOL_CHANNEL_ENABLED`.
 */
export function filterPreferenceChannelsByFeatureFlags(
  channels: IPreferenceChannels,
  { isToolChannelEnabled }: { isToolChannelEnabled: boolean }
): IPreferenceChannels {
  if (isToolChannelEnabled) {
    return channels;
  }

  const { tool: _omitted, ...rest } = channels;

  return rest;
}

/**
 * Omits feature-flagged channels from nested workflow preference objects
 * (`preferences.user` / `preferences.default`) when the flag is off.
 */
export function filterWorkflowPreferencesByFeatureFlags(
  preferences: WorkflowPreferences,
  options: { isToolChannelEnabled: boolean }
): WorkflowPreferences;
export function filterWorkflowPreferencesByFeatureFlags(
  preferences: WorkflowPreferences | null,
  options: { isToolChannelEnabled: boolean }
): WorkflowPreferences | null;
export function filterWorkflowPreferencesByFeatureFlags(
  preferences: WorkflowPreferences | null,
  { isToolChannelEnabled }: { isToolChannelEnabled: boolean }
): WorkflowPreferences | null {
  if (!preferences || isToolChannelEnabled) {
    return preferences;
  }

  const { tool: _omitted, ...channels } = preferences.channels;

  return {
    ...preferences,
    channels: channels as WorkflowPreferences['channels'],
  };
}
