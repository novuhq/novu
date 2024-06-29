import {
  ITenantDefine,
  ITriggerPayload,
  TriggerEventStatusEnum,
  TriggerRecipientsPayload,
  TriggerRecipientSubscriber,
} from '@novu/shared';

export type EventTriggerResult = {
  /**
   * Cancel the workflow execution
   */
  cancel: () => Promise<CancelEventTriggerResponse>;
  /**
   * Response data for the trigger
   */
  data: EventTriggerResponse;
};

export type EventTriggerParams<T_Payload = ITriggerPayload> = {
  /**
   * Workflow id
   */
  workflowId: string;
  /**
   * Recipients to trigger the workflow to
   */
  to: TriggerRecipientsPayload;
  /**
   * Actor to trigger the workflow from
   */
  actor?: TriggerRecipientSubscriber;
  /**
   * Bridge url to trigger the workflow to
   */
  bridgeUrl?: string;
  /**
   * Payload to trigger the workflow with
   */
  payload: T_Payload;
  /**
   * Tenant to trigger the workflow with
   */
  tenant?: ITenantDefine;
  /**
   * Transaction id for trigger
   */
  transactionId?: string;
  /**
   * Overrides for trigger
   */
  overrides?: Record<string, unknown>;
};

export type EventTriggerResponse = {
  /**
   * If trigger was acknowledged or not
   */
  acknowledged: boolean;
  /**
   * Status for trigger
   */
  status: `${TriggerEventStatusEnum}`;
  /**
   * Any errors encountered during the trigger
   */
  error?: string[];
  /**
   * Unique transaction identifier for the event
   */
  transactionId?: string;
};

/**
 * Flag indicating if the event was cancelled or not.
 * `false` indicates the event was not cancelled because the execution was completed.
 * `true` indicates the in-flight execution was cancelled.
 */
export type CancelEventTriggerResponse = boolean;
