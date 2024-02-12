import { useDataRef } from '@novu/shared-web';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePreviewSms } from '../../../api/hooks';
import { IForm } from '../components/formTypes';
import { useStepFormErrors } from './useStepFormErrors';
import { useStepFormPath } from './useStepFormPath';

export const usePreviewTemplate = (locale?: string) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();
  const templateContent = useWatch({
    name: `${path}.template.content`,
    control,
  });
  const [previewContent, setPreviewContent] = useState(templateContent as string);
  const previewData = useDataRef({ templateContent });
  const templateContentError = error?.template?.content?.message;

  const { isLoading, getSmsPreview } = usePreviewSms({
    onSuccess: (result) => {
      setPreviewContent(result.content);
    },
  });

  useEffect(() => {
    getSmsPreview({
      content: previewData.current.templateContent,
      payload: '',
      locale,
    });
  }, [locale, previewData, getSmsPreview]);

  const isPreviewContentLoading = !templateContentError && isLoading;

  return { previewContent, isPreviewContentLoading, templateContentError };
};
