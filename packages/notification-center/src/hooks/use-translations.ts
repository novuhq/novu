import { useContext } from 'react';
import { I18NContext } from '../store/i18n.context';
import { ITranslationEntry, TRANSLATIONS } from '../i18n/lang';

export function useTranslations() {
  const { translations, lang } = useContext<ITranslationEntry>(I18NContext);

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
