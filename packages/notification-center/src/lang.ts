export interface ITranslationEntry {
  readonly translations: {
    readonly notifications: string;
    readonly markAllAsRead: string;
    readonly poweredBy: string;
    readonly settings: string;
  };
  readonly lang: string;
}

export const TRANSLATIONS: Record<I18NLanguage, ITranslationEntry['translations']> = {
  en: {
    notifications: 'Notifications',
    markAllAsRead: 'Mark all as read',
    poweredBy: 'Powered By',
    settings: 'Settings',
  },
};

export type I18NLanguage = 'en';
