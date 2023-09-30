import React from 'react';

import { I18NLanguage, ITranslationEntry, TRANSLATIONS } from '../i18n/lang';

export const I18NContext = React.createContext<ITranslationEntry>({
  translations: {
    markAllAsRead: '',
    notifications: '',
    poweredBy: '',
    settings: '',
    removeMessage: '',
    markAsRead: '',
    markAsUnRead: '',
  },
  lang: '',
});

interface INovuI18NProviderProps {
  i18n?: I18NLanguage | ITranslationEntry;
  children: JSX.Element;
}

export function NovuI18NProvider({ i18n = 'en', ...props }: INovuI18NProviderProps) {
  const i18nEntry = React.useMemo<ITranslationEntry>(() => {
    if (typeof i18n === 'string') {
      return {
        translations: TRANSLATIONS[i18n].translations,
        lang: i18n,
      };
    }

    return i18n;
  }, [i18n]);

  return <I18NContext.Provider {...props} value={i18nEntry} />;
}
