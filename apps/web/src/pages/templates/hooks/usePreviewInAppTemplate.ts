import { IMessageButton } from '@novu/shared';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { usePreviewInApp } from '../../../api/hooks';
import { useProcessVariables } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';
import { parsePayload } from '../../../utils';

export type ParsedPreviewStateType = {
  ctaButtons: IMessageButton[];
  content: string;
};

export const usePreviewInAppTemplate = ({ locale }: { locale?: string }) => {
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const templateError = useStepFormCombinedErrors();
  const templateContent = watch(`${path}.template.content`);
  const templateCta = watch(`${path}.template.cta`);
  const variables = watch(`${path}.template.variables`);
  const payload = useProcessVariables(variables);

  const [parsedPreviewState, setParsedPreviewState] = useState<ParsedPreviewStateType>({
    ctaButtons: [],
    content: '',
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
      if (!templateContent) return;

      getInAppPreview({
        locale,
        content: templateContent as string,
        payload: parsePayload(payloadArg),
        cta: templateCta,
      });
    },
    [getInAppPreview, locale, templateCta, templateContent]
  );

  useEffect(() => {
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
