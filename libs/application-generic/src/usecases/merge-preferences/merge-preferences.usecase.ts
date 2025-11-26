/** biome-ignore-all lint/complexity/noStaticOnlyClass: needed */

import { PreferencesEntity } from '@novu/dal';
import { ChannelTypeEnum, PreferencesTypeEnum, WorkflowPreferences } from '@novu/shared';
import { toMerged } from 'es-toolkit';
import { GetPreferencesResponseDto } from '../get-preferences';
import { MergePreferencesCommand } from './merge-preferences.command';

/**
 * Merge preferences for a subscriber.
 *
 * The order of precedence is:
 * 1. Workflow resource preferences
 * 2. Workflow user preferences
 * 3. Subscriber global preferences
 * 4. Subscriber workflow preferences
 *
 * If a workflow has the readOnly flag set to true, the subscriber preferences are ignored.
 *
 * If the workflow does not have the readOnly flag set to true, the subscriber preferences are merged with the workflow preferences.
 *
 * If the subscriber has no preferences, the workflow preferences are returned.
 */
export class MergePreferences {
  // biome-ignore lint/suspicious/noExplicitAny: needed for flexible preference type handling
  private static normalize(preference: any): any {
    if (!preference?.preferences) {
      return preference;
    }

    const normalized = { ...preference, preferences: { ...preference.preferences } };
    const prefs = normalized.preferences;

    if (!prefs.all) {
      prefs.all = { enabled: true, readOnly: false };
    } else {
      prefs.all = {
        ...prefs.all,
        enabled: prefs.all.enabled ?? true,
        readOnly: prefs.all.readOnly ?? false,
      };
    }

    if (!prefs.channels) {
      prefs.channels = {};
    } else {
      prefs.channels = { ...prefs.channels };
    }

    const channels = Object.values(ChannelTypeEnum);
    for (const channel of channels) {
      if (!prefs.channels[channel]) {
        prefs.channels[channel] = { enabled: true };
      } else {
        prefs.channels[channel] = {
          ...prefs.channels[channel],
          enabled: prefs.channels[channel].enabled ?? true,
        };
      }
    }

    return normalized;
  }

  public static execute(command: MergePreferencesCommand): GetPreferencesResponseDto {
    const workflowPreferences = [command.workflowResourcePreference, command.workflowUserPreference].filter(
      (preference) => preference !== undefined
    );

    const subscriberPreferences = [command.subscriberGlobalPreference, command.subscriberWorkflowPreference].filter(
      (preference) => preference !== undefined
    );

    const isWorkflowPreferenceReadonly = workflowPreferences.some((preference) => preference.preferences.all?.readOnly);

    const preferencesList = [
      ...workflowPreferences,
      // If the workflow preference is readOnly, we disregard the subscriber preferences
      ...(isWorkflowPreferenceReadonly ? [] : subscriberPreferences),
    ];

    const normalizedPreferencesList = preferencesList.map((preference) => MergePreferences.normalize(preference));

    console.log('@@@@@ normalizedPreferencesList', JSON.stringify(normalizedPreferencesList, null, 2));
    const mergedPreferences = preferencesList.reduce(
      (acc, preference) => toMerged(acc, preference),
      {}
    ) as PreferencesEntity & { preferences: WorkflowPreferences };

    console.log('@@@@@ mergedPreferences', JSON.stringify(mergedPreferences, null, 2));

    // Build the source object
    const source = {
      [PreferencesTypeEnum.WORKFLOW_RESOURCE]: command.workflowResourcePreference?.preferences || null,
      [PreferencesTypeEnum.USER_WORKFLOW]: command.workflowUserPreference?.preferences || null,
      [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: command.subscriberGlobalPreference?.preferences || null,
      [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: command.subscriberWorkflowPreference?.preferences || null,
    };

    return {
      preferences: mergedPreferences.preferences,
      schedule: mergedPreferences.schedule,
      type: mergedPreferences.type,
      source,
    };
  }
}
