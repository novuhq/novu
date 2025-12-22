import { BaseCommand } from '../../commands';
import { PreferenceSet } from '../get-preferences/get-preferences.usecase';

export class MergePreferencesCommand extends BaseCommand {
  workflowResourcePreference?: PreferenceSet['workflowResourcePreference'];
  workflowUserPreference?: PreferenceSet['workflowUserPreference'];
  subscriberGlobalPreference?: PreferenceSet['subscriberGlobalPreference'];
  subscriberWorkflowPreference?: PreferenceSet['subscriberWorkflowPreference'];
  /**
   * If true, the default all enabled preference will be set to true.
   * If false, the default all enabled preference will kept as is.
   * @default true
   */
  ensureDefaultAllEnabled?: boolean = true;
}
