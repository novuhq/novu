import { AxiosInstance } from 'axios';
import {
  ISubscriberPayload,
  ISubscribers,
  IUpdateSubscriberPreferencePayload,
} from './subscriber.interface';

interface IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}

export class Subscribers implements ISubscribers {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  async list(page: number) {
    return await this.http.get(`/subscribers`, {
      params: {
        page,
      },
    });
  }

  async get(subscriberId: string) {
    return await this.http.get(`/subscribers/${subscriberId}`);
  }

  async identify(subscriberId: string, data: ISubscriberPayload) {
    return await this.http.post(`/subscribers`, {
      subscriberId,
      ...data,
    });
  }

  async update(subscriberId: string, data: ISubscriberPayload) {
    return await this.http.put(`/${subscriberId}/subscribers`, {
      ...data,
    });
  }

  async getPreference(subscriberId: string) {
    return await this.http.get(`/subscribers/${subscriberId}/preferences`);
  }

  async updatePreference(
    subscriberId: string,
    templateId: string,
    data: IUpdateSubscriberPreferencePayload
  ) {
    return await this.http.patch(
      `/subscribers/${subscriberId}/preferences/${templateId}`,
      {
        ...data,
      }
    );
  }

  async setCredentials(
    subscriberId: string,
    providerId: string,
    credentials: IChannelCredentials
  ) {
    return await this.http.put(`/subscribers/${subscriberId}/credentials`, {
      providerId,
      credentials: {
        ...credentials,
      },
    });
  }

  async delete(subscriberId: string) {
    return await this.http.delete(`/subscribers/${subscriberId}`);
  }
}
