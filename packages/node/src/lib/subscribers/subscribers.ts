import { AxiosInstance } from 'axios';
import { WithHttp } from '../novu.interface';
import {
  IGetSubscriberNotificationFeedParams,
  ISubscriberPayload,
  ISubscribers,
  IUpdateSubscriberPreferencePayload,
} from './subscriber.interface';

interface IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}

export class Subscribers extends WithHttp implements ISubscribers {
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
    return await this.http.put(`/subscribers/${subscriberId}`, {
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

  async getNotificationsFeed(
    subscriberId: string,
    params: IGetSubscriberNotificationFeedParams
  ) {
    return await this.http.get(
      `/subscribers/${subscriberId}/notifications/feed`,
      {
        params,
      }
    );
  }

  async getUnseenCount(subscriberId: string, seen: boolean) {
    return await this.http.get(
      `/subscribers/${subscriberId}/notifications/unseen`,
      {
        params: {
          seen,
        },
      }
    );
  }

  async markMessageSeen(subscriberId: string, messageId: string) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/${messageId}/seen`
    );
  }

  async markMessageActionSeen(
    subscriberId: string,
    messageId: string,
    type: string
  ) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/${messageId}/actions/${type}`
    );
  }
}
