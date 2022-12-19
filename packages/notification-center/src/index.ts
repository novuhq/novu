export type { IStoreQuery } from '@novu/client';
export type { IUserPreferenceSettings } from '@novu/client';

export * from './components';
export * from './hooks/use-unseen-count.hook';
export * from './hooks/use-socket.hook';
export * from './hooks/use-notifications.hook';
export * from './hooks/use-screens.hook';
export * from './hooks/use-subscriber-preference.hook';

export * from './store/novu-theme-provider.context';
export * from './i18n/lang';
export type { INovuPopoverTheme } from './store/novu-theme.context';
export type { INotificationCenterStyles } from './store/styles';

export { SubscriberPreference } from './components/notification-center/components/user-preference/SubscriberPreference';

export { colors } from './shared/config/colors';
export type { ColorScheme } from './shared/config/colors';
export { getDefaultTheme, getDefaultBellColors } from './utils/defaultTheme';
export { getStyleByPath } from './utils/styles';

export * from './shared/enums';
export * from './shared/interfaces';
