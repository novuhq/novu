import { ChannelTypeEnum } from './channel';
import { DeepPartial } from './utils';

/**
 * The preference type for a set of preferences.
 *
 * Each preference type is resolved in order of specificity,
 * with 1 being the most specific and 4 being the least specific.
 *
 * 1. `SUBSCRIBER_WORKFLOW` - The subscriber's preference for a workflow.
 * 2. `SUBSCRIBER_GLOBAL` - The subscriber's global preference.
 * 3. `USER_WORKFLOW` - The user's preference for a workflow.
 * 4. `WORKFLOW_RESOURCE` - The Framework-defined preference for a workflow.
 */
export enum PreferencesTypeEnum {
  SUBSCRIBER_WORKFLOW = 'SUBSCRIBER_WORKFLOW',
  SUBSCRIBER_GLOBAL = 'SUBSCRIBER_GLOBAL',
  USER_WORKFLOW = 'USER_WORKFLOW',
  WORKFLOW_RESOURCE = 'WORKFLOW_RESOURCE',
}

/**
 * A preference for a notification delivery workflow.
 *
 * This provides a shortcut to setting all channels to the same preference.
 */
export type WorkflowPreference = {
  /**
   * A flag specifying if notification delivery is enabled for the workflow.
   *
   * If `true`, notification delivery is enabled by default for all channels.
   *
   * This setting can be overridden by the channel preferences.
   *
   * @default true
   */
  enabled: boolean;
  /**
   * A flag specifying if the preference is read-only.
   *
   * If `true`, the preference cannot be changed by the Subscriber.
   *
   * @default false
   */
  readOnly: boolean;
};

/** A preference for a notification delivery channel. */
export type ChannelPreference = {
  /**
   * A flag specifying if notification delivery is enabled for the channel.
   *
   * If `true`, notification delivery is enabled.
   *
   * @default true
   */
  enabled: boolean;
};

export type WorkflowPreferences = {
  /**
   * A preference for the workflow.
   *
   * The values specified here will be used if no preference is specified for a channel.
   */
  all: WorkflowPreference;
  /**
   * A preference for each notification delivery channel.
   *
   * If no preference is specified for a channel, the `all` preference will be used.
   */
  channels: Record<ChannelTypeEnum, ChannelPreference>;
};

/** A partial set of workflow preferences. */
export type WorkflowPreferencesPartial = DeepPartial<WorkflowPreferences>;
