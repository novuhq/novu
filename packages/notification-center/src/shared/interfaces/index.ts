import {
  ButtonTypeEnum,
  IMessage,
  IMessageAction,
  IOrganizationEntity,
  ISubscriberJwt,
  MessageActionStatusEnum,
} from '@novu/shared';
import type { IStoreQuery } from '@novu/client';

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
  fetchNextPage?: (storeId?: string) => void;
  hasNextPage?: Record<string, boolean>;
  fetching?: boolean;
  markAsRead?: (messageId: string, storeId?: string) => void;
  markAllAsRead?: (storeId?: string) => Promise<number>;
  updateAction?: (
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>,
    storeId?: string
  ) => void;
  refetch?: (storeId?: string, query?: IStoreQuery) => void;
  markAsSeen?: (messageId?: string, readExist?: boolean, messages?: IMessage | IMessage[], storeId?: string) => void;
  onWidgetClose?: () => void;
  onTabChange?: (storeId?: string) => void;
}

export interface ITab {
  name: string;
  storeId: string;
}
