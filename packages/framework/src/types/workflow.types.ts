import type { Step } from './step.types';
import type { Subscriber } from './subscriber.types';
import type { Prettify } from './util.types';
import type { Schema } from './schema.types';
import { ChannelTypeEnum } from '@novu/shared';

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

export type WorkflowOptionChannelPreference = {
  defaultValue?: boolean;
  readOnly?: boolean;
};

export type WorkflowOptionsPreferences = {
  workflow?: WorkflowOptionChannelPreference;
  channels?: {
    [key in (typeof ChannelTypeEnum)[keyof typeof ChannelTypeEnum]]?: WorkflowOptionChannelPreference;
  };
};

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
  controlSchema?: T_ControlSchema;
  preferences?: WorkflowOptionsPreferences;
  tags?: string[];
};
