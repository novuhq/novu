import type {
  ITenantDefine,
  ITriggerPayload,
  TriggerEventStatusEnum,
  TriggerRecipientsPayload,
  TriggerRecipientSubscriber,
} from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/ban-types
type EventPayload = ITriggerPayload & {};

// eslint-disable-next-line @typescript-eslint/ban-types
type Actor = TriggerRecipientSubscriber & {};

type Tenant = ITenantDefine & Record<string, never>;

// eslint-disable-next-line @typescript-eslint/ban-types
type Recipients = TriggerRecipientsPayload & {};

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

export type EventTriggerParams<T_Payload = EventPayload> = {
  /**
   * Workflow id
   */
  workflowId: string;
  /**
   * Recipients to trigger the workflow to
   */
  to: Recipients;
  /**
   * Actor to trigger the workflow from
   */
  actor?: Actor;
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
  tenant?: Tenant;
  /**
   * Transaction id for trigger
   */
  transactionId?: string;
  /**
   * Overrides for trigger
   */
  overrides?: Record<string, unknown>;
  /**
   * Controls for the step execution
   */
  controls?: {
    steps: {
      [stepId: string]: Record<string, unknown>;
    };
  };
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
