import { Subscriber } from './subscriber.types';
import { ITenantDefine, ITriggerPayload, TriggerRecipientsPayload, TriggerRecipientSubscriber } from '@novu/shared';

export interface IEvent {
  data: Record<string, unknown>;
  workflowId: string;
  stepId: string;
  inputs: Record<string, unknown>;
  controls: Record<string, unknown>;
  state: IState[];
  action: 'execute' | 'preview';
  subscriber: Subscriber;
}

export interface ITriggerEvent {
  workflowId: string;
  to: TriggerRecipientsPayload;
  actor?: TriggerRecipientSubscriber;
  bridgeUrl?: string;
  payload: ITriggerPayload;
  tenant?: ITenantDefine;
  transactionId?: string;
  overrides?: Record<string, unknown>;
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
  options: unknown;
  metadata: ExecuteOutputMetadata;
};
