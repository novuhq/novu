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

export { ColorScheme } from './shared/config/colors';

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

export * from './shared/interfaces';
