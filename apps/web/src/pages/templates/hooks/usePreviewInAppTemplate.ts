import { IMessageButton } from '@novu/shared';
import { useDataRef } from '@novu/shared-web';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePreviewInApp } from '../../../api/hooks';
import { useProcessVariables } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';

export const usePreviewInAppTemplate = (locale?: string) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateError = useStepFormCombinedErrors();
  const templateContent = useWatch({
    name: `${path}.template.content`,
    control,
  });

  const templateVariables = useWatch({
    name: `${path}.template.variables`,
    control,
  });

  const templateCta = useWatch({
    name: `${path}.template.cta`,
    control,
  });
  const templateEnableAvatar = useWatch({
    name: `${path}.template.enableAvatar` as any,
    control,
  });

  const [parsedPreviewState, setParsedPreviewState] = useState<{
    ctaButtons: IMessageButton[];
    content: string;
  }>({
    ctaButtons: [],
    content: templateContent as string,
  });

  const processedVariables = useProcessVariables(templateVariables);

  const previewData = useDataRef({ templateContent, templateCta, templateEnableAvatar });

  const { isLoading, getInAppPreview } = usePreviewInApp({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.content,
        ctaButtons: result.ctaButtons,
      });
    },
  });

  useEffect(() => {
    getInAppPreview({
      locale,
      content: previewData.current.templateContent as string,
      payload: processedVariables,
      cta: previewData.current.templateCta,
    });
  }, [getInAppPreview, locale, previewData, processedVariables]);

  const parseInAppContent = useCallback(
    ({ payload }) => {
      getInAppPreview({
        locale,
        payload,
        content: previewData.current.templateContent as string,
        cta: previewData.current.templateCta,
      });
    },
    [getInAppPreview, locale, previewData]
  );

  const isPreviewLoading = !templateError && isLoading;

  return { parsedPreviewState, isPreviewLoading, templateError, parseInAppContent, processedVariables };
};
