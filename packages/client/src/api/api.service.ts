import {
  IMessage,
  HttpClient,
  ButtonTypeEnum,
  MessageActionStatusEnum,
  IParamObject,
} from '@novu/shared';
import {
  ITabCountQuery,
  IStoreQuery,
  IUserPreferenceSettings,
  IUnseenCountQuery,
} from '../index';

export class ApiService {
  private httpClient: HttpClient;

  isAuthenticated = false;

  constructor(private backendUrl: string) {
    this.httpClient = new HttpClient(backendUrl);
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

  /**
   * @deprecated The method should not be used - Use markMessageAs instead.
   */
  async markMessageAsSeen(messageId: string | string[]): Promise<any> {
    return await this.httpClient.post(
      `/widgets/messages/${messageId}/seen`,
      {}
    );
  }

  /**
   * @deprecated The method should not be used - Use markMessageAs instead.
   */
  async markMessageAsRead(messageId: string | string[]): Promise<any> {
    return await this.httpClient.post(
      `/widgets/messages/${messageId}/read`,
      {}
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

  async getNotificationsList(
    page: number,
    query: IStoreQuery = {}
  ): Promise<IMessage[]> {
    return await this.httpClient.get(`/widgets/notifications/feed`, {
      page,
      ...query,
    });
  }

  async initializeSession(
    appId: string,
    subscriberId: string,
    hmacHash = null
  ) {
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
      query as unknown as IParamObject
    );
  }

  async getTabCount(query: ITabCountQuery = {}) {
    return await this.httpClient.get(
      '/widgets/notifications/count',
      query as unknown as IParamObject
    );
  }

  async getOrganization() {
    return this.httpClient.get('/widgets/organization');
  }

  async getUserPreference(): Promise<IUserPreferenceSettings[]> {
    return this.httpClient.get('/widgets/preferences');
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
}
