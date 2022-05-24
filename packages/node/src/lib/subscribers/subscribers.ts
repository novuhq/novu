import { AxiosInstance } from 'axios';
import { ISubscriberPayload, ISubscribers } from './subscriber.interface';
import { IChannelCredentials } from '@novu/shared';

export class Subscribers implements ISubscribers {
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
    return await this.http.put(`/subscribers/${subscriberId}`, {
      ...data,
    });
  }

  async setCredentials(
    subscriberId: string,
    integrationId: string,
    credentials: IChannelCredentials
  ) {
    return await this.http.put(`/subscribers/${subscriberId}/channels`, {
      channel: {
        integrationId,
        credentials: {
          ...credentials,
        },
      },
    });
  }

  async delete(subscriberId: string) {
    return await this.http.delete(`/subscribers/${subscriberId}`);
  }
}
