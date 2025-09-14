/** biome-ignore-all lint/suspicious/noImplicitAnyLet: In order to merge the preferences */
/** biome-ignore-all lint/complexity/noStaticOnlyClass: In order to merge the preferences */
/** biome-ignore-all lint/suspicious/noExplicitAny: In order to merge the preferences */
import { DEFAULT_WORKFLOW_PREFERENCES, PreferencesTypeEnum } from '@novu/shared';
import { merge } from 'es-toolkit/compat';
import { GetPreferencesResponseDto } from '../get-preferences';
import { MergePreferencesCommand } from './merge-preferences.command';

/**
 * CPU-efficient merge that yields to the event loop when processing many preferences.
 * This prevents blocking the main thread during intensive merge operations.
 */
async function mergePreferencesWithYielding(preferencesList: any[]): Promise<any> {
  // Always start with default preferences structure
  const defaultBase = {};

  if (preferencesList.length === 0) {
    return defaultBase;
  }

  if (preferencesList.length === 1) {
    return merge(defaultBase, preferencesList[0]);
  }

  // For small lists, merge directly without yielding overhead
  if (preferencesList.length <= 4) {
    return merge(defaultBase, ...preferencesList);
  }

  // For larger lists, batch merge operations to yield to CPU
  const batchSize = 2;
  let result = defaultBase;

  for (let i = 0; i < preferencesList.length; i += batchSize) {
    const batch = preferencesList.slice(i, i + batchSize);
    const batchResult = merge({}, ...batch);
    result = merge(result, batchResult);

    // Yield to event loop every few batches to prevent CPU blocking
    if (i > 0 && i % (batchSize * 2) === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  return result;
}

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
  public static async execute(command: MergePreferencesCommand): Promise<GetPreferencesResponseDto> {
    // Early exit optimization: collect non-undefined preferences efficiently
    const workflowPreferences: any[] = [];
    if (command.workflowResourcePreference) {
      workflowPreferences.push(command.workflowResourcePreference);
    }
    if (command.workflowUserPreference) {
      workflowPreferences.push(command.workflowUserPreference);
    }

    // Early exit: check for readonly flag to avoid processing subscriber preferences
    const isWorkflowPreferenceReadonly = workflowPreferences.some((preference) => preference.preferences.all?.readOnly);

    const preferencesList = [...workflowPreferences];

    // Only process subscriber preferences if workflow is not readonly
    if (!isWorkflowPreferenceReadonly) {
      if (command.subscriberGlobalPreference) {
        preferencesList.push(command.subscriberGlobalPreference);
      }
      if (command.subscriberWorkflowPreference) {
        preferencesList.push(command.subscriberWorkflowPreference);
      }
    }

    const mergedPreferences = await mergePreferencesWithYielding(preferencesList);

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
