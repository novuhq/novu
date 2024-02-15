import { useEffect, useState } from 'react';

import { useGetLocalesFromContent } from '../../../api/hooks';
import { useAuthController, useDataRef } from '../../../hooks';

export const useTemplateLocales = ({
  content,
  title,
  disabled,
}: {
  content: string;
  title?: string;
  disabled: boolean;
}) => {
  const { organization } = useAuthController();
  const [selectedLocale, setSelectedLocale] = useState('');

  const previewData = useDataRef({ content, title });

  const { data: locales, isLoading: areLocalesLoading, getLocalesFromContent } = useGetLocalesFromContent();

  useEffect(() => {
    if (!disabled) {
      let combinedContent = previewData.current.content;
      /*
       * combining title and content to get locales based upon variables in both title and content
       * The api is not concerned about the content type, it will parse the given string and return the locales
       */
      if (previewData.current.title) {
        combinedContent += ` ${previewData.current.title}`;
      }

      getLocalesFromContent({
        content: combinedContent,
      });
    }
  }, [disabled, getLocalesFromContent, previewData]);

  const onLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
  };

  return { locales, areLocalesLoading, selectedLocale: selectedLocale || organization?.defaultLocale, onLocaleChange };
};
