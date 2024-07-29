import { PostActionEnum } from '../constants';
import type { Subscriber } from './subscriber.types';

export type Event = {
  /** @deprecated */
  data: Record<string, unknown>;
  payload: Record<string, unknown>;
  workflowId: string;
  stepId: string;
  /** @deprecated */
  inputs: Record<string, unknown>;
  controls: Record<string, unknown>;
  state: State[];
  action: Exclude<PostActionEnum, PostActionEnum.TRIGGER>;
  subscriber: Subscriber;
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
};

export type ExecuteOutput = {
  outputs: Record<string, unknown>;
  providers?: Record<string, Record<string, unknown>>;
  options: ExecuteOutputOptions;
  metadata: ExecuteOutputMetadata;
};
