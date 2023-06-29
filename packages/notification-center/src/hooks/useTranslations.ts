import { useContext } from 'react';
import { Locale } from 'date-fns';
import * as dateFnsLocales from 'date-fns/locale';
import { ITranslationEntry, TRANSLATIONS } from '../i18n/lang';
import { I18NContext } from '../store/i18n.context';

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
    dateFnsLocale: (): Locale => {
      return lang in dateFnsLocales ? dateFnsLocales[lang] : dateFnsLocales.enUS;
    },
  };
}
