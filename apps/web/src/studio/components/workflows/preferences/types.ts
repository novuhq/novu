import { ChannelTypeEnum } from '@novu/shared';

/** @deprecated TODO: these are temporary types until they can be imported from shared. */
export type Preference = {
  // `default` specifies the channel delivery preference.
  // The default value is `defaultValue: true`
  // - `defaultValue: true`: channel delivery is enabled
  // - `defaultValue: false`: channel delivery is disabled
  defaultValue: boolean;
  // An flag denoting that the Subscriber can only read the `defaultValue`
  // value and is not allowed to modify it.
  readOnly?: boolean;
};

/** @deprecated TODO: these are temporary types until they can be imported from shared. */
export type WorkflowPreferences = {
  // The preference object for the Workflow.
  // Workflow preferences are used to specify the default
  // delivery preference across all channels
  workflow: Preference;
  // The preferences object for delivery Channels.
  // Channel preferences are used to specify the default
  // delivery preference for a specific channel
  channels: Record<ChannelTypeEnum, Preference>;
};

export type PreferenceChannel = ChannelTypeEnum | 'workflow';
export type SubscriptionPreferenceRow = {
  channel: PreferenceChannel;
} & Preference;
