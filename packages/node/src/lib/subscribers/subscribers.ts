import type { AxiosResponse } from 'axios';
import { MarkMessagesAsEnum } from '@novu/shared';

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

interface IMarkAllMessageAs {
  feedId?: string | string[];
  markAs: MarkMessagesAsEnum;
}

export class Subscribers extends WithHttp implements ISubscribers {
  async list(page = 0, limit = 10) {
    return await this.http.get(`/subscribers`, {
      params: {
        page,
        limit,
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

  async deleteCredentials(subscriberId: string, providerId: string) {
    return await this.http.delete(
      `/subscribers/${subscriberId}/credentials/${providerId}`
    );
  }

  /**
   * @deprecated Use deleteCredentials instead
   */
  async unsetCredentials(subscriberId: string, providerId: string) {
    return await this.http.put(`/subscribers/${subscriberId}/credentials`, {
      providerId,
      credentials: { webhookUrl: undefined, deviceTokens: [] },
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
      `/subscribers/${subscriberId}/messages/markAs`,
      { messageId, mark: { seen: true } }
    );
  }

  async markMessageRead(subscriberId: string, messageId: string) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/markAs`,
      { messageId, mark: { read: true } }
    );
  }

  async markAllMessagesAs(
    subscriberId: string,
    markAs: IMarkAllMessageAs
  ): Promise<AxiosResponse<{ data: number }>> {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/mark-all`,
      markAs
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
