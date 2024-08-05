import { NovuOptions } from '../novu';
import { Appearance, Localization } from './context';
import type { Notification } from '../notifications';

export type NotificationMounter = (el: HTMLDivElement, options: { notification: Notification }) => () => void;
export type BellMounter = (el: HTMLDivElement, options: { unreadCount: number }) => () => void;

export type BaseNovuProviderProps = {
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
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
