import { useDataRef } from '@novu/shared-web';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePreviewPush } from '../../../api/hooks';
import { useProcessVariables } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';

export const usePreviewPushTemplate = (locale?: string) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateError = useStepFormCombinedErrors();
  const templateContent = useWatch({
    name: `${path}.template.content`,
    control,
  });

  const templateTitle = useWatch({
    name: `${path}.template.title`,
    control,
  });

  const templateVariables = useWatch({
    name: `${path}.template.variables`,
    control,
  });

  const [parsedPreviewState, setParsedPreviewState] = useState({
    title: templateTitle,
    content: templateContent as string,
  });

  const processedVariables = useProcessVariables(templateVariables);

  const previewData = useDataRef({ templateContent, templateTitle, processedVariables });

  const { isLoading, getPushPreview } = usePreviewPush({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.content,
        title: result.title,
      });
    },
  });

  useEffect(() => {
    getPushPreview({
      locale,
      content: previewData.current.templateContent,
      payload: previewData.current.processedVariables,
      title: previewData.current.templateTitle,
    });
  }, [getPushPreview, locale, previewData]);

  const isPreviewLoading = !templateError && isLoading;

  return { parsedPreviewState, isPreviewLoading, templateError };
};
