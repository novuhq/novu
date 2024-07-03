import type { Step } from './step.types';
import type { Subscriber } from './subscriber.types';

/**
 * The parameters for the workflow function.
 */
export type ExecuteInput<T_Payload, T_Control> = {
  /** Define a step in your workflow. */
  step: Step;
  /** The payload for the event, provided during trigger. */
  payload: T_Payload;
  /** The subscriber for the event, provided during trigger. */
  subscriber: Subscriber;
  /** The environment the workflow is running in. */
  environment: Record<string, unknown>;
  /**
   * The controls for the event. Provided via the UI.
   *
   * @deprecated Use `controls` instead
   */
  input: T_Control;
  /** The controls for the event. Provided via the UI. */
  controls: T_Control;
};

/**
 * The function to execute the workflow.
 */
export type Execute<T_Payload, T_Control> = (event: ExecuteInput<T_Payload, T_Control>) => Promise<void>;

/**
 * The options for the workflow.
 */
export type WorkflowOptions<T_PayloadSchema, T_ControlSchema> = {
  /** The schema for the payload. */
  payloadSchema?: T_PayloadSchema;
  /**
   * The schema for the controls.
   *
   * @deprecated Use `controlSchema` instead
   */
  inputSchema?: T_ControlSchema;
  controlSchema?: T_ControlSchema;
};
