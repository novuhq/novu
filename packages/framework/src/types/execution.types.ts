import { PostActionEnum } from '../constants';
import type { ContextResolved } from './context.types';
import type { EnvironmentSystemVariables } from './environment.types';
import { WithPassthrough } from './provider.types';
import type { Subscriber } from './subscriber.types';

export type Event = {
  payload: Record<string, unknown>;
  workflowId: string;
  stepId: string;
  controls: Record<string, unknown>;
  state: State[];
  action: Exclude<PostActionEnum, PostActionEnum.TRIGGER>;
  subscriber: Subscriber;
  actor?: Subscriber;
  context: ContextResolved;
  /** User-defined env vars merged with environment system variables (name, type). */
  env: EnvironmentSystemVariables & Record<string, string>;
};

export type State = {
  stepId: string;
  outputs: Record<string, unknown>;
  state: { status: string; error?: string };
};

export type ExecuteOutputMetadata = {
  status: string;
  error: boolean;
  /**
   * The duration of the step execution in milliseconds
   */
  duration: number;
};

export type ExecuteOutputOptions = {
  skip: boolean;
  /** When set, the chat step edits the message from this prior step instead of sending a new one. */
  updateStepId?: string;
};

export type ExecuteOutput = {
  outputs: Record<string, unknown>;
  providers?: Record<string, WithPassthrough<Record<string, unknown>>>;
  options: ExecuteOutputOptions;
  metadata: ExecuteOutputMetadata;
};
