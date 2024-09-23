import { ChannelTypeEnum } from '../channel';
import { DeepPartial } from '../shared';

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
