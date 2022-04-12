import { AxiosInstance } from 'axios';
import { ISubscriberPayload } from './subscriber.interface';

export class Subscribers {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  async identify(subscriberId: string, data: ISubscriberPayload) {
    return await this.http.post(`/subscribers`, {
      subscriberId,
      ...data,
    });
  }

  async update(subscriberId: string, data: ISubscriberPayload) {
    return await this.http.put(`/subscribers`, {
      subscriberId,
      ...data,
    });
  }
}
