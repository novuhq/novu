import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useGetLocalesFromContent } from '../../../api/hooks';
import { useAuthController, useDataRef } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useStepFormPath } from './useStepFormPath';

export const useTemplateLocales = () => {
  const { organization } = useAuthController();
  const [selectedLocale, setSelectedLocale] = useState('');
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateContent = useWatch({
    name: `${path}.template.content`,
    control,
  });
  const previewData = useDataRef({ templateContent });

  const { data: locales, isLoading: areLocalesLoading, getLocalesFromContent } = useGetLocalesFromContent();

  useEffect(() => {
    getLocalesFromContent({
      content: previewData.current.templateContent,
    });
  }, [getLocalesFromContent, previewData]);

  const onLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
  };

  return { locales, areLocalesLoading, selectedLocale: selectedLocale || organization?.defaultLocale, onLocaleChange };
};
