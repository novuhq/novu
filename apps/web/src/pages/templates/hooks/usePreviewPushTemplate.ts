import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { usePreviewPush } from '../../../api/hooks';
import { useDataRef, useProcessVariables } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';

export const usePreviewPushTemplate = ({ disabled, locale }: { disabled: boolean; locale?: string }) => {
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateError = useStepFormCombinedErrors();
  const templateContent = watch(`${path}.template.content`);
  const templateTitle = watch(`${path}.template.title`);
  const templateVariables = watch(`${path}.template.variables`);

  const [parsedPreviewState, setParsedPreviewState] = useState({
    title: templateTitle,
    content: templateContent as string,
  });

  const processedVariables = useProcessVariables(templateVariables);

  const { isLoading, getPushPreview } = usePreviewPush({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.content,
        title: result.title,
      });
    },
  });

  useEffect(() => {
    if (disabled) return;

    getPushPreview({
      locale,
      content: templateContent,
      payload: processedVariables,
      title: templateTitle,
    });
  }, [getPushPreview, disabled, locale, templateContent, processedVariables, templateTitle]);

  const isPreviewLoading = !templateError && isLoading;

  return { parsedPreviewState, isPreviewLoading, templateError };
};
