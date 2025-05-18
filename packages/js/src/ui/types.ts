import type { JSXElement } from 'solid-js';
import type { Notification } from '../notifications';
import { Novu } from '../novu';
import type { NotificationFilter, NovuOptions, Preference } from '../types';
import { appearanceKeys } from './config';
import { Localization } from './context/LocalizationContext';

export type NotificationClickHandler = (notification: Notification) => void;
export type NotificationActionClickHandler = (notification: Notification) => void;

export type NotificationRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type SubjectRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type BodyRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type BellRenderer = (el: HTMLDivElement, unreadCount: number) => () => void;
export type RouterPush = (path: string) => void;

export type Tab = {
  label: string;
  /**
   * @deprecated Use `filter` instead
   */
  value?: Array<string>;
  filter?: Pick<NotificationFilter, 'tags'>;
};

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
  colorShadow?: string;
  colorRing?: string;
  fontSize?: string;
  borderRadius?: string;
  colorStripes?: string;
};

export type AppearanceKey = (typeof appearanceKeys)[number];
export type Elements = Partial<Record<AppearanceKey, ElementStyles>>;

export type IconKey =
  | 'bell'
  | 'clock'
  | 'arrowDropDown'
  | 'dots'
  | 'markAsRead'
  | 'cogs'
  | 'trash'
  | 'markAsArchived'
  | 'markAsArchivedRead'
  | 'markAsUnread'
  | 'markAsUnarchived'
  | 'unsnooze'
  | 'arrowRight'
  | 'arrowLeft'
  | 'unread'
  | 'sms'
  | 'inApp'
  | 'email'
  | 'push'
  | 'chat'
  | 'check'
  | 'arrowDown'
  | 'routeFill'
  | 'info'
  | 'nodeTree';

export type IconRenderer = (el: HTMLDivElement, props: { class?: string }) => () => void;

export type IconOverrides = {
  [key in IconKey]?: IconRenderer;
};

export type Theme = {
  variables?: Variables;
  elements?: Elements;
  animations?: boolean;
  icons?: IconOverrides;
};
export type Appearance = Theme & { baseTheme?: Theme | Theme[] };

export type BaseNovuProviderProps = {
  container?: Node | string | null;
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
  tabs?: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  routerPush?: RouterPush;
  novu?: Novu;
};

export type NovuProviderProps = BaseNovuProviderProps & {
  renderNotification?: NotificationRenderer;
  renderBell?: BellRenderer;
};

export enum NotificationStatus {
  UNREAD_READ = 'unreadRead',
  UNREAD = 'unread',
  ARCHIVED = 'archived',
  SNOOZED = 'snoozed',
}

export type PreferencesFilter = Pick<NotificationFilter, 'tags'>;

type PreferenceFilterFunction = (args: { preferences: Preference[] }) => Preference[];

type PreferenceGroupFilter = (PreferencesFilter & { workflowIds?: string[] }) | PreferenceFilterFunction;

export type PreferenceGroups = Array<{
  name: string;
  filter: PreferenceGroupFilter;
}>;

export { Localization, LocalizationKey } from './context/LocalizationContext';
