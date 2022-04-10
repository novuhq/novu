import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { ITriggerPayload } from './template/template.interface';

export class Novu extends EventEmitter {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  constructor(apiKey: string) {
    super();

    this.apiKey = apiKey;

    this.http = axios.create({
      baseURL: 'https://api.novu.co/v1',
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
  }

  async trigger(eventId: string, data: ITriggerPayload) {
    if (this.apiKey) {
      return await this.http.post(`/events/trigger`, {
        name: eventId,
        payload: {
          ...data,
        },
      });
    }
  }
}
