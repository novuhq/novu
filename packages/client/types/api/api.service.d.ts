import {
  IMessage,
  ButtonTypeEnum,
  MessageActionStatusEnum,
} from '@novu/shared';
import { IStoreQuery, IUserPreferenceSettings } from '../index';
export declare class ApiService {
  private backendUrl;
  private httpClient;
  isAuthenticated: boolean;
  constructor(backendUrl: string);
  setAuthorizationToken(token: string): void;
  disposeAuthorizationToken(): void;
  updateAction(
    messageId: string,
    executedType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ): Promise<any>;
  markMessageAsSeen(messageId: string): Promise<any>;
  getNotificationsList(page: number, query?: IStoreQuery): Promise<IMessage[]>;
  initializeSession(
    appId: string,
    subscriberId: string,
    hmacHash?: any
  ): Promise<any>;
  postUsageLog(
    name: string,
    payload: {
      [key: string]: string | boolean | undefined;
    }
  ): Promise<any>;
  getUnseenCount(query?: IStoreQuery): Promise<any>;
  getOrganization(): Promise<any>;
  getUserPreference(): Promise<IUserPreferenceSettings[]>;
  updateSubscriberPreference(
    templateId: string,
    channelType: string,
    enabled: boolean
  ): Promise<IUserPreferenceSettings>;
}
//# sourceMappingURL=api.service.d.ts.map
