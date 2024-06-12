import {
  ButtonTypeEnum,
  MessageActionStatusEnum,
  CustomDataType,
  IPaginatedResponse,
  ISessionDto,
  INotificationDto,
} from '@novu/shared';
import { HttpClient } from '../http-client';
import {
  ITabCountQuery,
  IStoreQuery,
  IUserPreferenceSettings,
  IUnseenCountQuery,
  IUnreadCountQuery,
  IUserGlobalPreferenceSettings,
  ApiOptions,
} from '../index';

export class ApiService {
  private httpClient: HttpClient;

  isAuthenticated = false;

  constructor(backendUrl: string, apiVersion?: ApiOptions['apiVersion']);
  constructor(options?: ApiOptions);
  constructor(...args: any) {
    if (arguments.length === 2) {
      this.httpClient = new HttpClient({
        backendUrl: args[0],
        apiVersion: args[1],
      });
    } else if (arguments.length === 1) {
      if (typeof args[0] === 'object') {
        this.httpClient = new HttpClient(args[0]);
      } else if (typeof args[0] === 'string') {
        this.httpClient = new HttpClient({
          backendUrl: args[0],
        });
      }
    } else {
      this.httpClient = new HttpClient();
    }
  }

  setAuthorizationToken(token: string) {
    this.httpClient.setAuthorizationToken(token);

    this.isAuthenticated = true;
  }

  disposeAuthorizationToken() {
    this.httpClient.disposeAuthorizationToken();

    this.isAuthenticated = false;
  }

  async updateAction(
    messageId: string,
    executedType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ): Promise<any> {
    return await this.httpClient.post(
      `/widgets/messages/${messageId}/actions/${executedType}`,
      {
        executedType,
        status,
        payload,
      }
    );
  }

  async markMessageAs(
    messageId: string | string[],
    mark: { seen?: boolean; read?: boolean }
  ): Promise<any> {
    const markPayload =
      mark.seen === undefined && mark.read === undefined
        ? { seen: true }
        : mark;

    return await this.httpClient.post(`/widgets/messages/markAs`, {
      messageId,
      mark: markPayload,
    });
  }

  async removeMessage(messageId: string): Promise<any> {
    return await this.httpClient.delete(`/widgets/messages/${messageId}`, {});
  }

  async removeMessages(messageIds: string[]): Promise<any> {
    return await this.httpClient.post(`/widgets/messages/bulk/delete`, {
      messageIds: messageIds,
    });
  }

  async removeAllMessages(feedId?: string): Promise<any> {
    const url = feedId
      ? `/widgets/messages?feedId=${feedId}`
      : `/widgets/messages`;

    return await this.httpClient.delete(url);
  }

  async markAllMessagesAsRead(feedId?: string | string[]): Promise<any> {
    return await this.httpClient.post(`/widgets/messages/read`, {
      feedId,
    });
  }

  async markAllMessagesAsSeen(feedId?: string | string[]): Promise<any> {
    return await this.httpClient.post(`/widgets/messages/seen`, {
      feedId,
    });
  }

  async getNotificationsList(
    page: number,
    { payload, ...rest }: IStoreQuery = {}
  ): Promise<IPaginatedResponse<INotificationDto>> {
    const payloadString = payload ? btoa(JSON.stringify(payload)) : undefined;

    return await this.httpClient.getFullResponse(
      `/widgets/notifications/feed`,
      {
        page,
        ...(payloadString && { payload: payloadString }),
        ...rest,
      }
    );
  }

  async initializeSession(
    appId: string,
    subscriberId: string,
    hmacHash = null
  ): Promise<ISessionDto> {
    return await this.httpClient.post(`/widgets/session/initialize`, {
      applicationIdentifier: appId,
      subscriberId: subscriberId,
      hmacHash,
    });
  }

  async postUsageLog(
    name: string,
    payload: { [key: string]: string | boolean | undefined }
  ) {
    return await this.httpClient.post('/widgets/usage/log', {
      name: `[Widget] - ${name}`,
      payload,
    });
  }

  async getUnseenCount(query: IUnseenCountQuery = {}) {
    return await this.httpClient.get(
      '/widgets/notifications/unseen',
      query as unknown as CustomDataType
    );
  }

  async getUnreadCount(query: IUnreadCountQuery = {}) {
    return await this.httpClient.get(
      '/widgets/notifications/unread',
      query as unknown as CustomDataType
    );
  }

  async getTabCount(query: ITabCountQuery = {}) {
    return await this.httpClient.get(
      '/widgets/notifications/count',
      query as unknown as CustomDataType
    );
  }

  async getOrganization() {
    return this.httpClient.get('/widgets/organization');
  }

  async getUserPreference(): Promise<IUserPreferenceSettings[]> {
    return this.httpClient.get('/widgets/preferences');
  }

  async getUserGlobalPreference(): Promise<IUserGlobalPreferenceSettings[]> {
    return this.httpClient.get('/widgets/preferences/global');
  }

  async updateSubscriberPreference(
    templateId: string,
    channelType: string,
    enabled: boolean
  ): Promise<IUserPreferenceSettings> {
    return await this.httpClient.patch(`/widgets/preferences/${templateId}`, {
      channel: { type: channelType, enabled },
    });
  }

  async updateSubscriberGlobalPreference(
    preferences: { channelType: string; enabled: boolean }[],
    enabled?: boolean
  ): Promise<IUserPreferenceSettings> {
    return await this.httpClient.patch(`/widgets/preferences`, {
      preferences: preferences.map((preference) => ({
        ...preference,
        type: preference.channelType,
      })),
      enabled,
    });
  }
}
