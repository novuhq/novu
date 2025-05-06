import merge from 'lodash/merge';
import { PreferencesTypeEnum } from '@novu/shared';

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
  public static execute(
    command: MergePreferencesCommand,
  ): GetPreferencesResponseDto {
    const workflowPreferences = [
      command.workflowResourcePreference,
      command.workflowUserPreference,
    ].filter((preference) => preference !== undefined);

    const subscriberPreferences = [
      command.subscriberGlobalPreference,
      command.subscriberWorkflowPreference,
    ].filter((preference) => preference !== undefined);

    const isWorkflowPreferenceReadonly = workflowPreferences.some(
      (preference) => preference.preferences.all?.readOnly,
    );

    const preferencesList = [
      ...workflowPreferences,
      // If the workflow preference is readOnly, we disregard the subscriber preferences
      ...(isWorkflowPreferenceReadonly ? [] : subscriberPreferences),
    ];

    const mergedPreferences = merge({}, ...preferencesList);

    // Build the source object
    const source = {
      [PreferencesTypeEnum.WORKFLOW_RESOURCE]:
        command.workflowResourcePreference?.preferences || null,
      [PreferencesTypeEnum.USER_WORKFLOW]:
        command.workflowUserPreference?.preferences || null,
      [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]:
        command.subscriberGlobalPreference?.preferences || null,
      [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]:
        command.subscriberWorkflowPreference?.preferences || null,
    };

    return {
      preferences: mergedPreferences.preferences,
      type: mergedPreferences.type,
      source,
    };
  }
}
