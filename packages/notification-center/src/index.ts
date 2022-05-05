import { IMessage, ISubscriberJwt, IOrganizationEntity } from '@novu/shared';

export * from './components';
export * from './hooks/use-unseen-count.hook';
export * from './hooks/use-socket.hook';
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
  isLoading: boolean;
  header: () => JSX.Element;
  footer: () => JSX.Element;
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

export declare type ColorScheme = 'light' | 'dark';
