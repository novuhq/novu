import { Step } from './step.types';
import { Subscriber } from './subscriber.types';

/**
 * The input for the workflow function.
 */
export type ExecuteInput<T_Payload, T_Input> = {
  /** Define a step in your workflow. */
  step: Step;
  /** The payload for the event, provided during trigger. */
  payload: T_Payload;
  /** The subscriber for the event, provided during trigger. */
  subscriber: Subscriber;
  /** The environment the workflow is running in. */
  environment: Record<string, unknown>;
  /** The inputs for the event. Provided via the UI. */
  input: T_Input;
};

/**
 * The function to execute the workflow.
 */
export type Execute<T_Payload, T_Input> = (event: ExecuteInput<T_Payload, T_Input>) => Promise<void>;

/**
 * The options for the workflow.
 */
export type WorkflowOptions<T_PayloadSchema, T_InputSchema> = {
  /** The schema for the payload. */
  payloadSchema?: T_PayloadSchema;
  /** The schema for the inputs. */
  inputSchema?: T_InputSchema;
};
