import type { Notification } from '../notifications';
import type { NovuOptions } from '../types';
import { defaultLocalization, appearanceKeys } from './config';

export type NotificationClickHandler = (args: { notification: Notification }) => void;
export type NotificationActionClickHandler = (args: { notification: Notification }) => void;

export type NotificationMounter = (
  el: HTMLDivElement,
  options: {
    notification: Notification;
  }
) => () => void;
export type BellMounter = (el: HTMLDivElement, options: { unreadCount: number }) => () => void;

export type Tab = { label: string; value: Array<string> };

export type CSSProperties = {
  [key: string]: string | number;
};

export type ElementStyles = string | CSSProperties;

export type Variables = {
  colorBackground?: string;
  colorForeground?: string;
  colorPrimary?: string;
  colorPrimaryForeground?: string;
  colorSecondary?: string;
  colorSecondaryForeground?: string;
  colorCounter?: string;
  colorCounterForeground?: string;
  colorNeutral?: string;
  fontSize?: string;
  borderRadius?: string;
};

export type AppearanceKey = (typeof appearanceKeys)[number];
export type Elements = Partial<Record<AppearanceKey, ElementStyles>>;

export type Theme = {
  variables?: Variables;
  elements?: Elements;
};
export type Appearance = Theme & { baseTheme?: Theme | Theme[] };

export type LocalizationKey = keyof typeof defaultLocalization;
export type Localization = Partial<Record<LocalizationKey, string>>;

export type BaseNovuProviderProps = {
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
  tabs?: Array<Tab>;
};

export type NovuProviderProps = BaseNovuProviderProps & {
  mountNotification?: NotificationMounter;
  mountBell?: BellMounter;
};

export enum NotificationStatus {
  UNREAD_READ = 'unreadRead',
  UNREAD = 'unread',
  ARCHIVED = 'archived',
}
