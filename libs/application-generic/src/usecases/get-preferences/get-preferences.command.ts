import { EnvironmentCommand } from '../../commands';

export class GetPreferencesCommand extends EnvironmentCommand {
  // todo: the usecase uses this field as _subscriberId nv-6940
  // refactor-rename-subscriberId to _subscriberId
  subscriberId?: string;
  templateId?: string;
  /**
   * Excludes subscriber-level preferences from the merge calculation.
   * Used for subscription preferences where subscribers cannot control the preferences,
   * ensuring only workflow-level preferences are considered to avoid unintended side effects.
   */
  excludeSubscriberPreferences?: boolean = false;
  contextKeys?: string[];
}
