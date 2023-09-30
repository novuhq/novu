import { useContext } from 'react';

import { TRANSLATIONS } from '../i18n/lang';
import { I18NContext } from '../store/i18n.context';

export function useTranslations() {
  const { translations, lang } = useContext(I18NContext);

  return {
    lang,
    t: (key: keyof typeof translations) => {
      /**
       * Fallback to english when a key for a specified languages does not exist
       */
      return translations[key] || TRANSLATIONS.en.translations[key];
    },
  };
}
