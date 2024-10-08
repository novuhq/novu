import type { Step } from './step.types';
import type { Subscriber } from './subscriber.types';
import type { DeepPartial, Prettify } from './util.types';
import type { Schema } from './schema.types';
import { WorkflowChannelEnum } from '../constants';

/**
 * The parameters for the workflow function.
 */
export type ExecuteInput<T_Payload extends Record<string, unknown>, T_Controls extends Record<string, unknown>> = {
  /** Define a step in your workflow. */
  step: Step;
  /** The payload for the event, provided during trigger. */
  payload: T_Payload;
  /** The subscriber for the event, provided during trigger. */
  subscriber: Prettify<Subscriber>;
  /** The environment the workflow is running in. */
  environment: Record<string, unknown>;
  /**
   * The controls for the event. Provided via the UI.
   *
   * @deprecated Use `controls` instead
   */
  input: T_Controls;
  /** The controls for the event. Provided via the UI. */
  controls: T_Controls;
};

/**
 * The function to execute the workflow.
 */
export type Execute<T_Payload extends Record<string, unknown>, T_Controls extends Record<string, unknown>> = (
  event: ExecuteInput<T_Payload, T_Controls>
) => Promise<void>;

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

/**
 * A partial set of workflow preferences.
 */
export type WorkflowPreferences = DeepPartial<{
  /**
   * A default preference for the channels.
   *
   * The values specified here will be used if no preference is specified for a channel.
   */
  all: WorkflowPreference;
  /**
   * A preference for each notification delivery channel.
   *
   * If no preference is specified for a channel, the `all` preference will be used.
   */
  channels: Record<WorkflowChannelEnum, ChannelPreference>;
}>;

/**
 * The options for the workflow.
 */
export type WorkflowOptions<T_PayloadSchema extends Schema, T_ControlSchema extends Schema> = {
  /** The schema for the payload. */
  payloadSchema?: T_PayloadSchema;
  /**
   * The schema for the controls.
   *
   * @deprecated Use `controlSchema` instead
   */
  inputSchema?: T_ControlSchema;
  /** The schema for the controls. */
  controlSchema?: T_ControlSchema;
  /**
   * The preferences for the notification workflow.
   *
   * If no preference is specified for a channel, the `all` preference will be used.
   *
   * @example
   * ```ts
   * // Enable notification delivery for only the in-app channel by default.
   * {
   *   all: { enabled: false },
   *   channels: {
   *     inApp: { enabled: true },
   *   },
   * }
   * ```
   *
   * @example
   * ```ts
   * // Enable notification delivery for all channels by default.
   * {
   *   all: { enabled: true }
   * }
   * ```
   *
   * @example
   * ```ts
   * // Enable notification delivery for all channels by default,
   * // disallowing the Subscriber to change the preference.
   * {
   *   all: { enabled: true, readOnly: true },
   * }
   * ```
   *
   * @example
   * ```ts
   * // Disable notification delivery for all channels by default,
   * // allowing the Subscriber to change the preference.
   * {
   *   all: { enabled: false, readOnly: false },
   * }
   * ```
   *
   * @example
   * ```ts
   * // Disable notification delivery for only the in-app channel by default,
   * // allowing the Subscriber to change the preference.
   * {
   *   all: { readOnly: false },
   *   channels: {
   *     inApp: { enabled: false },
   *   },
   * }
   * ```
   */
  preferences?: WorkflowPreferences;
  /** The tags for the workflow. */
  tags?: string[];
};
