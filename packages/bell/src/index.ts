import { IMessage, ISubscriberJwt } from '@novu/shared';

export * from './components';

export interface IAuthContext {
  setToken: (token: string) => void;
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
  sendUrlChange: (url: string) => void;
  sendNotificationClick: (notification: IMessage) => void;
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
  bellLoading: (isLoading) => void;
  socketUrl?: string;
}

export declare type ColorScheme = 'light' | 'dark';
