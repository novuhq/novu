import { AxiosResponse } from 'axios';
import { ButtonTypeEnum, IChannelCredentials } from '@novu/shared';
import { MarkMessagesAsEnum } from '@novu/shared';
import {
  IGetSubscriberNotificationFeedParams,
  IMarkFields,
  IMarkMessageActionFields,
  ISubscriberPayload,
  ISubscribers,
  IUpdateSubscriberPreferencePayload,
} from './subscriber.interface';
import { WithHttp } from '../novu.interface';

export class Subscribers extends WithHttp implements ISubscribers {
  async list(page = 0, limit = 10) {
    return await this.getRequest(`/subscribers`, {
      params: {
        page,
        limit,
      },
    });
  }

  async get(subscriberId: string) {
    return await this.getRequest(`/subscribers/${subscriberId}`);
  }

  /**
   * @deprecated Use create instead
   */
  async identify(subscriberId: string, data: ISubscriberPayload) {
    return await this.postRequest(`/subscribers`, {
      subscriberId,
      ...data,
    });
  }

  async create(subscriberId: string, data: ISubscriberPayload) {
    return await this.postRequest(`/subscribers`, {
      subscriberId,
      ...data,
    });
  }

  async update(subscriberId: string, data: ISubscriberPayload) {
    return await this.putRequest(`/subscribers/${subscriberId}`, {
      ...data,
    });
  }

  // TODO: Add integrationIdentifier optional parameter
  async setCredentials(
    subscriberId: string,
    providerId: string,
    credentials: IChannelCredentials
  ) {
    return await this.putRequest(`/subscribers/${subscriberId}/credentials`, {
      providerId,
      credentials: {
        ...credentials,
      },
    });
  }

  async deleteCredentials(subscriberId: string, providerId: string) {
    return await this.deleteRequest(
      `/subscribers/${subscriberId}/credentials/${providerId}`
    );
  }

  /**
   * @deprecated Use deleteCredentials instead
   */
  async unsetCredentials(subscriberId: string, providerId: string) {
    return await this.putRequest(`/subscribers/${subscriberId}/credentials`, {
      providerId,
      credentials: { webhookUrl: undefined, deviceTokens: [] },
    });
  }

  async updateOnlineStatus(subscriberId: string, online: boolean) {
    return await this.patchRequest(
      `/subscribers/${subscriberId}/online-status`,
      {
        online,
      }
    );
  }

  async delete(subscriberId: string) {
    return await this.deleteRequest(`/subscribers/${subscriberId}`);
  }

  async getPreference(subscriberId: string) {
    return await this.getRequest(`/subscribers/${subscriberId}/preferences`);
  }

  async updatePreference(
    subscriberId: string,
    templateId: string,
    data: IUpdateSubscriberPreferencePayload
  ) {
    return await this.patchRequest(
      `/subscribers/${subscriberId}/preferences/${templateId}`,
      {
        ...data,
      }
    );
  }

  async getNotificationsFeed(
    subscriberId: string,
    params: IGetSubscriberNotificationFeedParams
  ) {
    return await this.getRequest(
      `/subscribers/${subscriberId}/notifications/feed`,
      {
        params,
      }
    );
  }

  // TODO: Add read option and change method name to getInAppMessagesCount
  async getUnseenCount(subscriberId: string, seen: boolean) {
    return await this.getRequest(
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
    return await this.postRequest(
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
    return await this.postRequest(
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
    return await this.postRequest(
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
    return await this.postRequest(
      `/subscribers/${subscriberId}/messages/${messageId}/actions/${type}`,
      {
        status: data.status,
        ...(data?.payload && { payload: data.payload }),
      }
    );
  }
}
