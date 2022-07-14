import React from 'react';
import { I18NLanguage, ITranslationEntry, TRANSLATIONS } from '../lang';

export const I18NContext = React.createContext<ITranslationEntry>({
  markAllAsRead: '',
  notifications: '',
  poweredBy: '',
});

interface INovuI18NProviderProps {
  i18n?: I18NLanguage | ITranslationEntry;
  children: JSX.Element;
}

export function NovuI18NProvider({ i18n, ...props }: INovuI18NProviderProps) {
  const i18nEntry = React.useMemo<ITranslationEntry>(() => {
    if (!i18n) {
      return TRANSLATIONS.en;
    }

    if (typeof i18n === 'string') {
      return TRANSLATIONS[i18n];
    }

    return i18n;
  }, [i18n]);

  return <I18NContext.Provider {...props} value={i18nEntry} />;
}
