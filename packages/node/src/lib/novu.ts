import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { Subscribers } from './subscribers/subscribers';
import { ITriggerPayloadOptions } from './subscribers/subscriber.interface';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  readonly subscribers: Subscribers;

  constructor(apiKey: string, config?: INovuConfiguration) {
    super();

    const backendUrl = config?.backendUrl
      ? config?.backendUrl
      : 'https://api.novu.co/v1';

    this.apiKey = apiKey;

    this.http = axios.create({
      baseURL: backendUrl,
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });

    this.subscribers = new Subscribers(this.http);
  }

  async trigger(eventId: string, data: ITriggerPayloadOptions) {
    return await this.http.post(`/events/trigger`, {
      name: eventId,
      to: data.to,
      payload: {
        ...data?.payload,
      },
    });
  }
}
