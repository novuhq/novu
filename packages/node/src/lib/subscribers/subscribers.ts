import { AxiosInstance } from 'axios';
import {
  ISubscriberPayload,
  IUpdateSubscriberPreferencePayload,
} from './subscriber.interface';

export class Subscribers {
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
      `/subscribers/${subscriberId}/preference/${templateId}`,
      {
        ...data,
      }
    );
  }

  async delete(subscriberId: string) {
    return await this.http.delete(`/subscribers/${subscriberId}`);
  }
}
