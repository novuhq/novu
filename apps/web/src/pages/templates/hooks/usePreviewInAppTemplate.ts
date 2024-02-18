import { IMessageButton } from '@novu/shared';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { usePreviewInApp } from '../../../api/hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';

export type ParsedPreviewStateType = {
  ctaButtons: IMessageButton[];
  content: string;
};

export const usePreviewInAppTemplate = ({ locale, payload }: { locale?: string; payload: string }) => {
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateError = useStepFormCombinedErrors();
  const templateContent = watch(`${path}.template.content`);
  const templateCta = watch(`${path}.template.cta`);

  const [parsedPreviewState, setParsedPreviewState] = useState<ParsedPreviewStateType>({
    ctaButtons: [],
    content: templateContent as string,
  });

  const { isLoading, getInAppPreview } = usePreviewInApp({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.content,
        ctaButtons: result.ctaButtons,
      });
    },
  });

  const getInAppPreviewCallback = useCallback(
    (payloadArg: string) => {
      if (!locale || !templateContent) return;

      getInAppPreview({
        locale,
        content: templateContent as string,
        payload: JSON.parse(payloadArg),
        cta: templateCta,
      });
    },
    [getInAppPreview, locale, templateCta, templateContent]
  );

  useEffect(() => {
    if (!locale) return;

    getInAppPreviewCallback(payload);
  }, [getInAppPreviewCallback, locale, payload]);

  const isPreviewLoading = !templateError && isLoading;

  return {
    parsedPreviewState,
    isPreviewLoading,
    templateError,
    parseInAppContent: getInAppPreviewCallback,
  };
};
