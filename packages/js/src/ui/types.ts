import { NovuOptions } from '../novu';
import { Appearance, Localization } from './context';

export type NovuProviderProps = {
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
};

export enum NotificationStatus {
  UNREAD_READ = 'Unread & read',
  UNREAD = 'Unread only',
  ARCHIVED = 'Archived',
}
