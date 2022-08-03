import { IMessage, HttpClient, ButtonTypeEnum, MessageActionStatusEnum, IParamObject } from '@novu/shared';
import { IStoreQuery } from '../index';

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
    return await this.httpClient.post(`/widgets/messages/${messageId}/actions/${executedType}`, {
      executedType,
      status,
      payload,
    });
  }

  async markMessageAsSeen(messageId: string): Promise<any> {
    return await this.httpClient.post(`/widgets/messages/${messageId}/seen`, {});
  }

  async getNotificationsList(page: number, query: IStoreQuery = {}): Promise<IMessage[]> {
    return await this.httpClient.get(`/widgets/notifications/feed`, {
      page,
      ...query,
    });
  }

  async initializeSession(appId: string, subscriberId: string, hmacHash = null) {
    return await this.httpClient.post(`/widgets/session/initialize`, {
      applicationIdentifier: appId,
      subscriberId: subscriberId,
      hmacHash,
    });
  }

  async postUsageLog(name: string, payload: { [key: string]: string | boolean | undefined }) {
    return await this.httpClient.post('/widgets/usage/log', {
      name: `[Widget] - ${name}`,
      payload,
    });
  }

  async getUnseenCount(query: IStoreQuery = {}) {
    return await this.httpClient.get('/widgets/notifications/unseen', query as unknown as IParamObject);
  }

  async getOrganization() {
    return this.httpClient.get('/widgets/organization');
  }

  async getUserPreference() {
    return this.httpClient.get('/widgets/preferences');
  }

  async updateSubscriberPreference(templateId: string, channelType: string, enabled: boolean): Promise<any> {
    return await this.httpClient.patch(`/widgets/preference/${templateId}`, {
      channel: { type: channelType, enabled },
    });
  }
}
