import { Subscriber } from './subscriber.types';

export interface IEvent {
  data: Record<string, unknown>;
  workflowId: string;
  stepId: string;
  inputs: Record<string, unknown>;
  state: IState[];
  action: 'execute' | 'preview';
  subscriber: Subscriber;
}

interface IState {
  stepId: string;
  outputs: any;
  state: { status: string; error?: string };
}

export type ExecuteOutputMetadata = {
  status: string;
  error: boolean;
  /**
   * The duration of the step execution in milliseconds
   */
  duration: number;
};

export type ExecuteOutput = {
  outputs: unknown;
  providers: unknown;
  metadata: ExecuteOutputMetadata;
};
