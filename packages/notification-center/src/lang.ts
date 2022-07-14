export interface ITranslationEntry {
  readonly notifications: string;
  readonly markAllAsRead: string;
  readonly poweredBy: string;
}

export type I18NLanguage = 'en';

export const TRANSLATIONS: Record<I18NLanguage, ITranslationEntry> = {
  en: {
    notifications: 'Notifications',
    markAllAsRead: 'Mark all as read',
    poweredBy: 'Powered By',
  },
};
