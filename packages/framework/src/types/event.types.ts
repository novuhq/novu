import { Novu } from '@novu/api';
import { Prettify } from './util.types';

export type EventTriggerResult = {
  /**
   * Cancel the workflow execution
   */
  cancel: () => CancelEventTriggerResponse;
  /**
   * Response data for the trigger
   */
  data: Prettify<Awaited<EventTriggerResponse>>;
};

export type EventTriggerParams<T_Payload = Record<string, any>> = Omit<Parameters<Novu['trigger']>[0], 'payload'> & {
  payload: T_Payload;
  bridgeUrl?: string;
};

export type EventTriggerResponse = ReturnType<Novu['trigger']>;

export type CancelEventTriggerResponse = ReturnType<Novu['events']['cancel']>;
