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
  /**
   * Bypasses the WORKFLOW_PREFERENCES LRU cache for this read so it is served
   * directly from the database. Used by interactive dashboard (JWT) reads that
   * require read-your-own-write consistency across API instances.
   */
  skipCache?: boolean = false;
}
