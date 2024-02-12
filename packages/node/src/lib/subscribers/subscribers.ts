import { AxiosResponse } from 'axios';
import {
  ButtonTypeEnum,
  IChannelCredentials,
  ISubscribersDefine,
} from '@novu/shared';
import { MarkMessagesAsEnum, PreferenceLevelEnum } from '@novu/shared';
import {
  IGetSubscriberNotificationFeedParams,
  IMarkFields,
  IMarkMessageActionFields,
  ISubscriberPayload,
  ISubscribers,
  IUpdateSubscriberGlobalPreferencePayload,
  IUpdateSubscriberPreferencePayload,
} from './subscriber.interface';
import { WithHttp } from '../novu.interface';

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

  async bulkCreate(subscribers: ISubscribersDefine[]) {
    return await this.http.post(`/subscribers/bulk`, {
      subscribers,
    });
  }

  async update(subscriberId: string, data: ISubscriberPayload) {
    return await this.http.put(`/subscribers/${subscriberId}`, {
      ...data,
    });
  }

  async setCredentials(
    subscriberId: string,
    providerId: string,
    credentials: IChannelCredentials,
    integrationIdentifier?: string
  ) {
    return await this.http.put(`/subscribers/${subscriberId}/credentials`, {
      providerId,
      credentials: {
        ...credentials,
      },
      ...(integrationIdentifier && { integrationIdentifier }),
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

  async updateOnlineStatus(subscriberId: string, online: boolean) {
    return await this.http.patch(`/subscribers/${subscriberId}/online-status`, {
      online,
    });
  }

  async delete(subscriberId: string) {
    return await this.http.delete(`/subscribers/${subscriberId}`);
  }

  async getPreference(subscriberId: string) {
    return await this.http.get(`/subscribers/${subscriberId}/preferences`);
  }

  async getGlobalPreference(subscriberId: string) {
    return await this.http.get(
      `/subscribers/${subscriberId}/preferences/${PreferenceLevelEnum.GLOBAL}`
    );
  }

  async getPreferenceByLevel(subscriberId: string, level: PreferenceLevelEnum) {
    return await this.http.get(
      `/subscribers/${subscriberId}/preferences/${level}`
    );
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

  async updateGlobalPreference(
    subscriberId: string,
    data: IUpdateSubscriberGlobalPreferencePayload
  ) {
    return await this.http.patch(`/subscribers/${subscriberId}/preferences`, {
      ...data,
    });
  }

  async getNotificationsFeed(
    subscriberId: string,
    { payload, ...rest }: IGetSubscriberNotificationFeedParams = {}
  ) {
    const payloadString = payload
      ? Buffer.from(JSON.stringify(payload)).toString('base64')
      : undefined;

    return await this.http.get(
      `/subscribers/${subscriberId}/notifications/feed`,
      {
        params: {
          payload: payloadString,
          ...rest,
        },
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

  /**
   * deprecated use markMessageAs instead
   */
  async markMessageSeen(subscriberId: string, messageId: string) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/markAs`,
      {
        messageId,
        mark: { seen: true },
      }
    );
  }

  /**
   * deprecated use markMessageAs instead
   */
  async markMessageRead(subscriberId: string, messageId: string) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/markAs`,
      {
        messageId,
        mark: { read: true },
      }
    );
  }

  async markMessageAs(
    subscriberId: string,
    messageId: string,
    mark: IMarkFields
  ) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/markAs`,
      {
        messageId,
        mark,
      }
    );
  }

  async markAllMessagesAs(
    subscriberId: string,
    markAs: MarkMessagesAsEnum,
    feedIdentifier?: string | string[]
  ): Promise<AxiosResponse<{ data: number }>> {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/mark-all`,
      { markAs, feedIdentifier }
    );
  }

  async markMessageActionSeen(
    subscriberId: string,
    messageId: string,
    type: ButtonTypeEnum,
    data: IMarkMessageActionFields
  ) {
    return await this.http.post(
      `/subscribers/${subscriberId}/messages/${messageId}/actions/${type}`,
      {
        status: data.status,
        ...(data?.payload && { payload: data.payload }),
      }
    );
  }
}
