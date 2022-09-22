import {
  ButtonTypeEnum,
  IMessage,
  IMessageAction,
  IOrganizationEntity,
  ISubscriberJwt,
  MessageActionStatusEnum,
} from '@novu/shared';
import { IStoreQuery } from '@novu/client';
export { IStoreQuery };
export { IUserPreferenceSettings } from '@novu/client';

export { IMessage, IMessageAction, IOrganizationEntity, ISubscriberJwt } from '@novu/shared';

export * from './components';
export * from './hooks/use-unseen-count.hook';
export * from './hooks/use-socket.hook';
export * from './hooks/use-notifications.hook';
export * from './hooks/use-screens.hook';
export * from './hooks/use-subscriber-preference.hook';

export { ScreensEnum } from './store/screens-provider.context';

export * from './store/novu-theme-provider.context';
export * from './i18n/lang';
export { INovuPopoverTheme } from './store/novu-theme.context';

export { SubscriberPreference } from './components/notification-center/components/user-preference/SubscriberPreference';

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

export interface INotificationCenterContext {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  onActionClick: (identifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  isLoading: boolean;
  header: () => JSX.Element;
  footer: () => JSX.Element;
  listItem: ListItem;
  actionsResultBlock: (templateIdentifier: string, messageAction: IMessageAction) => JSX.Element;
  tabs?: ITab[];
  showUserPreferences?: boolean;
  onTabClick?: (tab: ITab) => void;
}

export interface IStore {
  storeId: string;
  query?: IStoreQuery;
}

export type ListItem = (
  message: IMessage,
  onActionButtonClick: (actionButtonType: ButtonTypeEnum) => void,
  onNotificationClick: () => void
) => JSX.Element;

export interface INovuProviderContext {
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier?: string;
  initialized: boolean;
  socketUrl?: string;
  onLoad: (data: { organization: IOrganizationEntity }) => void;
  subscriberHash: string;
  stores?: IStore[];
}

export interface INotificationsContext {
  notifications?: Record<string, IMessage[]>;
  fetchNextPage?: (storeId?: string, query?: IStoreQuery) => void;
  hasNextPage?: Map<string, boolean>;
  fetching?: boolean;
  markAsSeen?: (messageId: string) => Promise<IMessage>;
  updateAction?: (
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>,
    storeId?: string
  ) => void;
  refetch?: (storeId?: string, query?: IStoreQuery) => void;
}

export declare type ColorScheme = 'light' | 'dark';

export interface ITab {
  name: string;
  storeId: string;
}
