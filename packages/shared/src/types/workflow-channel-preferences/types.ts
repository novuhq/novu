import { ChannelTypeEnum } from '../channel';
import { DeepPartial } from '../shared';

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
  /**
   * A flag specifying if the preference is read-only.
   *
   * If `true`, the preference cannot be changed by the User or Subscriber.
   *
   * @default false
   */
  readOnly: boolean;
};

export type WorkflowPreferences = {
  /**
   * A preference for the workflow.
   *
   * The values specified here will be used if no preference is specified for a channel.
   */
  workflow: ChannelPreference;
  /**
   * A preference for each notification deliverychannel.
   *
   * If no preference is specified for a channel, the `workflow` preference will be used.
   */
  channels: Record<ChannelTypeEnum, ChannelPreference>;
};

/** A partial set of workflow preferences. */
export type WorkflowPreferencesPartial = DeepPartial<WorkflowPreferences>;
