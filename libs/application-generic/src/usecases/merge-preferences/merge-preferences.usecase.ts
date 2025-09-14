/** biome-ignore-all lint/suspicious/noImplicitAnyLet: In order to merge the preferences */
/** biome-ignore-all lint/complexity/noStaticOnlyClass: In order to merge the preferences */
/** biome-ignore-all lint/suspicious/noExplicitAny: In order to merge the preferences */
import { DEFAULT_WORKFLOW_PREFERENCES, PreferencesTypeEnum, Schedule, WorkflowPreferences } from '@novu/shared';
import { merge } from 'es-toolkit';
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

    // Build source object
    const source = {
      [PreferencesTypeEnum.WORKFLOW_RESOURCE]: command.workflowResourcePreference?.preferences || null,
      [PreferencesTypeEnum.USER_WORKFLOW]: command.workflowUserPreference?.preferences || null,
      [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: command.subscriberGlobalPreference?.preferences || null,
      [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: command.subscriberWorkflowPreference?.preferences || null,
    };

    // Start with default preferences to ensure proper fallbacks
    let resultPreferences: WorkflowPreferences = DEFAULT_WORKFLOW_PREFERENCES;
    let resultSchedule: Schedule = {} as Schedule;
    let resultType;

    for (const pref of preferencesList) {
      if (pref.preferences) {
        resultPreferences = merge(resultPreferences, pref.preferences);
      }
      if (pref.schedule) {
        resultSchedule = merge(resultSchedule, pref.schedule);
      }
      if (pref.type) {
        resultType = pref.type;
      }
    }

    return {
      preferences: resultPreferences,
      schedule: Object.keys(resultSchedule).length > 0 ? resultSchedule : undefined,
      type: resultType,
      source,
    };
  }
}
