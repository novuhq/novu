import { BaseCommand } from '../../commands';
import { PreferenceSet } from '../get-preferences/get-preferences.usecase';

export class MergePreferencesCommand extends BaseCommand {
  workflowResourcePreference?: PreferenceSet['workflowResourcePreference'];
  workflowUserPreference?: PreferenceSet['workflowUserPreference'];
  subscriberGlobalPreference?: PreferenceSet['subscriberGlobalPreference'];
  subscriberWorkflowPreference?: PreferenceSet['subscriberWorkflowPreference'];
  /**
   * If true, subscriber preferences will be excluded from the merge calculation.
   * Used when extracting subscription preferences to only consider workflow-level preferences.
   * @default false
   */
  excludeSubscriberPreferences?: boolean = false;
}
