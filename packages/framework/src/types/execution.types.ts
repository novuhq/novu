import { Subscriber } from './subscriber.types';
import { ITenantDefine, ITriggerPayload, TriggerRecipientsPayload, TriggerRecipientSubscriber } from '@novu/shared';

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
  action: 'execute' | 'preview';
  subscriber: Subscriber;
};

export type TriggerEvent = {
  workflowId: string;
  to: TriggerRecipientsPayload;
  actor?: TriggerRecipientSubscriber;
  bridgeUrl?: string;
  payload: ITriggerPayload;
  tenant?: ITenantDefine;
  transactionId?: string;
  overrides?: Record<string, unknown>;
};

export type State = {
  stepId: string;
  outputs: any;
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

export type ExecuteOutput = {
  outputs: unknown;
  providers: unknown;
  options: unknown;
  metadata: ExecuteOutputMetadata;
};
