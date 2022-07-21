import {
  IMessage,
  ISubscriberJwt,
  IOrganizationEntity,
  IMessageAction,
  ButtonTypeEnum,
  MessageActionStatusEnum,
} from '@novu/shared';

export * from './components';
export * from './hooks/use-unseen-count.hook';
export * from './hooks/use-socket.hook';
export * from './hooks/use-notifications.hook';
export { IMessage } from '@novu/shared';

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
}

export interface INotificationsContext {
  notifications?: IMessage[];
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  fetching?: boolean;
  markAsSeen?: (messageId: string) => Promise<IMessage>;
  updateAction?: (
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) => void;
  refetch?: () => void;
}

export declare type ColorScheme = 'light' | 'dark';
