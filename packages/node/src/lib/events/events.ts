import {
  IBroadcastPayloadOptions,
  IBulkEvents,
  IEvents,
  ITriggerPayloadOptions,
} from './events.interface';
import { Novu } from '../novu';

export class Events implements IEvents {
  constructor(private readonly novu: Novu) {}

  async trigger(workflowIdentifier: string, data: ITriggerPayloadOptions) {
    return await this.novu.post(`/events/trigger`, {
      name: workflowIdentifier,
      to: data.to,
      payload: {
        ...data?.payload,
      },
      transactionId: data.transactionId,
      overrides: data.overrides || {},
      ...(data.actor && { actor: data.actor }),
    });
  }

  async bulkTrigger(events: IBulkEvents[]) {
    return await this.novu.post(`/events/trigger/bulk`, {
      events,
    });
  }

  async broadcast(workflowIdentifier: string, data: IBroadcastPayloadOptions) {
    return await this.novu.post(`/events/trigger/broadcast`, {
      name: workflowIdentifier,
      payload: {
        ...data?.payload,
      },
      overrides: data.overrides || {},
    });
  }

  async cancel(transactionId: string) {
    return await this.novu.delete(`/events/trigger/${transactionId}`);
  }
}
