import { useDataRef } from '@novu/shared-web';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePreviewSms } from '../../../api/hooks';
import { IForm } from '../components/formTypes';
import { useStepFormErrors } from './useStepFormErrors';
import { useStepFormPath } from './useStepFormPath';
import { useProcessVariables } from '../../../hooks';

export const usePreviewSmsTemplate = (locale?: string, showPreviewAsLoading?: boolean) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();
  const templateContent = useWatch({
    name: `${path}.template.content`,
    control,
  });
  const templateVariables = useWatch({
    name: `${path}.template.variables`,
    control,
  });
  const processedVariables = useProcessVariables(templateVariables);
  const [previewContent, setPreviewContent] = useState(templateContent as string);
  const previewData = useDataRef({ templateContent, processedVariables });
  const templateContentError = error?.template?.content?.message;

  const { isLoading, getSmsPreview } = usePreviewSms({
    onSuccess: (result) => {
      setPreviewContent(result.content);
    },
  });

  useEffect(() => {
    if (!showPreviewAsLoading) {
      getSmsPreview({
        content: previewData.current.templateContent,
        payload: previewData.current.processedVariables,
        locale,
      });
    }
  }, [locale, previewData, getSmsPreview, showPreviewAsLoading]);

  const isPreviewContentLoading = (!templateContentError && isLoading) || showPreviewAsLoading;

  return { previewContent, isPreviewContentLoading, templateContentError };
};
