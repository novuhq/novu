import { RefetchOptions, RefetchQueryFilters } from '@tanstack/react-query';

import { ButtonTypeEnum, IMessage, IMessageAction, IOrganizationEntity, ISubscriberJwt } from '@novu/shared';
import type { ApiService, IStoreQuery, IUserPreferenceSettings } from '@novu/client';
export {
  IMessage,
  IMessageAction,
  IOrganizationEntity,
  ISubscriberJwt,
  IPreferenceChannels,
  IMessageCTA,
  IActor,
  ActorTypeEnum,
  IMessageButton,
} from '@novu/shared';

export enum ScreensEnum {
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings',
}

export interface IAuthContext {
  applyToken: (token: string | null) => void;
  setUser: (profile: ISubscriberJwt) => void;

  token: string | null;
  user: ISubscriberJwt | null;
  isLoggedIn: boolean;
}

export interface ISocket {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (eventName: string, callback: (data: any) => void) => void;
  off: (eventName: string) => void;
}

export interface ISocketContext {
  socket: ISocket | null;
}

export interface IUserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type ListItem = (
  message: IMessage,
  onActionButtonClick: (actionButtonType: ButtonTypeEnum) => void,
  onNotificationClick: () => void
) => JSX.Element;

export interface INotificationCenterContext {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onActionClick: (identifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  actionsResultBlock: (templateIdentifier: string, messageAction: IMessageAction) => JSX.Element;
  onTabClick?: (tab: ITab) => void;
  preferenceFilter?: (userPreference: IUserPreferenceSettings) => boolean;
  isLoading: boolean;
  header: ({ setScreen, screen }: { setScreen: (screen: ScreensEnum) => void; screen: ScreensEnum }) => JSX.Element;
  footer: () => JSX.Element;
  emptyState: JSX.Element;
  listItem: ListItem;
  tabs?: ITab[];
  showUserPreferences?: boolean;
  allowedNotificationActions?: boolean;
}

export interface IStore {
  storeId: string;
  query?: IStoreQuery;
}

export interface IFetchingStrategy {
  fetchUnseenCount: boolean;
  fetchUnreadCount: boolean;
  fetchOrganization: boolean;
  fetchNotifications: boolean;
  fetchUserPreferences: boolean;
  fetchUserGlobalPreferences: boolean;
}

export interface INovuProviderContext {
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier?: string;
  isSessionInitialized: boolean;
  socketUrl?: string;
  subscriberHash: string;
  apiService: ApiService;
  socket?: ISocket;
  fetchingStrategy: IFetchingStrategy;
  setFetchingStrategy: (strategy: Partial<IFetchingStrategy>) => void;
  onLoad: (data: { organization: IOrganizationEntity }) => void;
  logout: VoidFunction;
}

export interface IStoreContext {
  storeQuery: IStoreQuery;
  storeId: string;
  stores: IStore[];
  setStore: (storeId?: string) => void;
}

export interface INotificationsContext extends IStoreContext {
  unseenCount: number;
  unreadCount: number;
  notifications: IMessage[];
  hasNextPage: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: <TPageData>({
    page,
    ...otherOptions
  }?: {
    page?: number;
  } & RefetchOptions &
    RefetchQueryFilters<TPageData>) => void;
  markNotificationAsRead: (messageId: string) => void;
  markNotificationAsUnRead: (messageId: string) => void;
  markNotificationAsSeen: (messageId: string) => void;
  removeMessage: (messageId: string) => void;
  removeAllMessages: (feedId?: string) => void;
  markFetchedNotificationsAsRead: () => void;
  markFetchedNotificationsAsSeen: () => void;
  markAllNotificationsAsRead: () => void;
  markAllNotificationsAsSeen: () => void;
}

export interface ITab {
  name: string;
  storeId: string;
}

export type Socket = {
  on: (event: string, listener: (data?: unknown) => void) => void;
  off: (event: string) => void;
  disconnect: () => void;
};

export interface ISession {
  token: string;
  profile: ISubscriberJwt;
}

export interface ICountData {
  count: number;
}

export type IMessageId = string | string[];
