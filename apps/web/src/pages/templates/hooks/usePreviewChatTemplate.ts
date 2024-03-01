import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { usePreviewChat } from '../../../api/hooks';
import { useProcessVariables } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';

export const usePreviewChatTemplate = ({ disabled, locale }: { disabled: boolean; locale?: string }) => {
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateContent = watch(`${path}.template.content`) as string;
  const variables = watch(`${path}.template.variables`);
  const processedVariables = useProcessVariables(variables);
  const [previewContent, setPreviewContent] = useState(templateContent);
  const templateError = useStepFormCombinedErrors();

  const { isLoading, getChatPreview } = usePreviewChat({
    onSuccess: (result) => {
      setPreviewContent(result.content);
    },
  });

  useEffect(() => {
    if (disabled) return;

    getChatPreview({
      content: templateContent,
      payload: JSON.parse(processedVariables),
      locale,
    });
  }, [locale, disabled, templateContent, processedVariables, getChatPreview]);

  const isPreviewContentLoading = !templateError && isLoading;

  return { previewContent, isPreviewContentLoading, templateError };
};
