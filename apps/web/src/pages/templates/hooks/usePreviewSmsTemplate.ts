import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { usePreviewSms } from '../../../api/hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';
import { useProcessVariables } from '../../../hooks';

export const usePreviewSmsTemplate = (locale?: string, disabled?: boolean) => {
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateContent = watch(`${path}.template.content`);
  const templateVariables = watch(`${path}.template.variables`);
  const [previewContent, setPreviewContent] = useState(templateContent as string);
  const processedVariables = useProcessVariables(templateVariables);
  const templateError = useStepFormCombinedErrors();

  const { isLoading, getSmsPreview } = usePreviewSms({
    onSuccess: (result) => {
      setPreviewContent(result.content);
    },
  });

  useEffect(() => {
    if (disabled) return;

    getSmsPreview({
      content: templateContent,
      payload: processedVariables,
      locale,
    });
  }, [locale, templateContent, processedVariables, disabled, getSmsPreview]);

  const isPreviewContentLoading = (!templateError && isLoading) || disabled;

  return { previewContent, isPreviewContentLoading, templateError };
};
