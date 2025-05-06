import { BaseCommand } from '../../commands';
import { PreferenceSet } from '../get-preferences/get-preferences.usecase';

export class MergePreferencesCommand extends BaseCommand {
  workflowResourcePreference?: PreferenceSet['workflowResourcePreference'];
  workflowUserPreference?: PreferenceSet['workflowUserPreference'];
  subscriberGlobalPreference?: PreferenceSet['subscriberGlobalPreference'];
  subscriberWorkflowPreference?: PreferenceSet['subscriberWorkflowPreference'];
}
