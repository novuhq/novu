import { NovuOptions } from '../novu';
import { InboxNotification } from '../types';
import { Appearance, Localization } from './context';

export type NotificationMounter = (el: HTMLDivElement, options: { notification: InboxNotification }) => () => void;
export type BellMounter = (el: HTMLDivElement, options: { unreadCount: number }) => () => void;

export type BaseNovuProviderProps = {
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
};

export type NovuProviderProps = BaseNovuProviderProps & {
  renderNotification?: NotificationMounter;
  renderBell?: BellMounter;
};

export enum NotificationStatus {
  UNREAD_READ = 'unreadRead',
  UNREAD = 'unread',
  ARCHIVED = 'archived',
}
