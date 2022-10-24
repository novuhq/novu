import {
  ButtonTypeEnum,
  IMessage,
  IOrganizationEntity,
  ISubscriberJwt,
  MessageActionStatusEnum,
  IMessageAction,
} from '@novu/shared';
import { IStoreQuery } from '@novu/client';

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
  onUnseenCountChanged: (unseenCount: number) => void;
  onActionClick: (identifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  isLoading: boolean;
  header: () => JSX.Element;
  footer: () => JSX.Element;
  emptyState: () => JSX.Element;
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

export interface INovuProviderContext {
  backendUrl?: string;
  subscriberId?: string;
  applicationIdentifier?: string;
  initialized: boolean;
  socketUrl?: string;
  onLoad: (data: { organization: IOrganizationEntity }) => void;
  subscriberHash: string;
}

export interface INotificationsContext {
  notifications?: Record<string, IMessage[]>;
  fetchNextPage?: (storeId?: string, query?: IStoreQuery) => void;
  hasNextPage?: Map<string, boolean>;
  fetching?: boolean;
  markAsRead?: (messageId: string, storeId?: string) => Promise<IMessage>;
  markAllAsRead?: (storeId?: string) => Promise<number>;
  updateAction?: (
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>,
    storeId?: string
  ) => void;
  refetch?: (storeId?: string, query?: IStoreQuery) => void;
  markNotificationsAsSeen?: (readExist?: boolean, messageIdsToMark?: IMessage | IMessage[], storeId?: string) => void;
  onWidgetClose?: () => void;
  onTabChange?: (storeId?: string) => void;
}

export interface ITab {
  name: string;
  storeId: string;
}
