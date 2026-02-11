/** biome-ignore-all lint/complexity/noStaticOnlyClass: needed */

import { PreferencesEntity } from '@novu/dal';
import { PreferencesTypeEnum, WorkflowPreferences } from '@novu/shared';
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
 * Subscriber preferences are excluded from the merge calculation when:
 * - The workflow has the readOnly flag set to true
 * - The excludeSubscriberPreferences flag is set to true (used for subscription preferences)
 *
 * If the subscriber has no preferences, the workflow preferences are returned.
 */
export class MergePreferences {
  /**
   * Ensures that `all.enabled` defaults to `true` if undefined.
   * Without this, if the `all` object is missing or `enabled` is undefined,
   * the merge result could incorrectly resolve to `false`, while the intended fallback is `true`.
   */
  private static ensureDefaultAllEnabled(preference: PreferencesEntity | undefined): PreferencesEntity | undefined {
    if (!preference?.preferences) {
      return preference;
    }

    const normalized = { ...preference, preferences: { ...preference.preferences } };

    if (normalized.preferences.all && normalized.preferences.all.enabled === undefined) {
      normalized.preferences.all = {
        ...normalized.preferences.all,
        enabled: true,
      };
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
    const shouldExcludeSubscriberPreferences = command.excludeSubscriberPreferences || isWorkflowPreferenceReadonly;

    const preferencesList = [
      ...workflowPreferences,
      ...(shouldExcludeSubscriberPreferences ? [] : subscriberPreferences),
    ];

    const normalizedPreferencesList = preferencesList.map((preference) =>
      MergePreferences.ensureDefaultAllEnabled(preference)
    );

    const mergedPreferences = normalizedPreferencesList.reduce(
      (acc, preference) => toMerged(acc, preference),
      {}
    ) as PreferencesEntity & { preferences: WorkflowPreferences };

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
