// axios must be imported because it is used with http
import axios from 'axios';
import {
  IBroadcastPayloadOptions,
  ITriggerPayloadOptions,
} from './events.interface';
import { WithHttp } from '../novu.interface';

export class Events extends WithHttp {
  async trigger(eventId: string, data: ITriggerPayloadOptions) {
    return await this.http.post(`/events/trigger`, {
      name: eventId,
      to: data.to,
      payload: {
        ...data?.payload,
      },
      overrides: data.overrides || {},
      ...(data.actor && { actor: data.actor }),
    });
  }

  async broadcast(eventId: string, data: IBroadcastPayloadOptions) {
    return await this.http.post(`/events/trigger/broadcast`, {
      name: eventId,
      payload: {
        ...data?.payload,
      },
      overrides: data.overrides || {},
    });
  }

  async cancel(transactionId: string) {
    return await this.http.delete(`/events/trigger/${transactionId}`);
  }
}
