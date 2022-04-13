import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { ITriggerPayload } from './template/template.interface';
import { Subscribers } from './subscribers/subscribers';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;
  readonly subscribers: Subscribers;

  constructor(apiKey: string) {
    super();

    this.apiKey = apiKey;

    this.http = axios.create({
      baseURL: 'https://api.novu.co/v1',
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });

    this.subscribers = new Subscribers(this.http);
  }

  async trigger(eventId: string, data: ITriggerPayload) {
    return await this.http.post(`/events/trigger`, {
      name: eventId,
      payload: {
        ...data,
      },
    });
  }
}
