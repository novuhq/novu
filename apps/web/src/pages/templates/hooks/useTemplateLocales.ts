import { useEffect, useState } from 'react';
import { IEmailBlock } from '@novu/shared';

import { useGetLocalesFromContent } from '../../../api/hooks';
import { useAuthController } from '../../../hooks';

export const useTemplateLocales = ({
  content,
  title,
  disabled,
}: {
  content?: string | IEmailBlock[];
  title?: string;
  disabled?: boolean;
}) => {
  const { organization } = useAuthController();
  const [selectedLocale, setSelectedLocale] = useState('');

  const { data: locales, isLoading: areLocalesLoading, getLocalesFromContent } = useGetLocalesFromContent();

  useEffect(() => {
    if (!content || disabled) {
      return;
    }

    let combinedContent = content;
    /*
     * combining title and content to get locales based upon variables in both title and content
     * The api is not concerned about the content type, it will parse the given string and return the locales
     */
    if (title) {
      combinedContent += ` ${title}`;
    }

    getLocalesFromContent({
      content: combinedContent,
    });
  }, [getLocalesFromContent, disabled, content, title]);

  const onLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
  };

  return { locales, areLocalesLoading, selectedLocale: selectedLocale || organization?.defaultLocale, onLocaleChange };
};
