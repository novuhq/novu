import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { usePreviewEmail } from '../../../api/hooks';
import { IForm } from '../components/formTypes';
import { useStepFormCombinedErrors } from './useStepFormCombinedErrors';
import { useStepFormPath } from './useStepFormPath';
import { parsePayload } from '../../../utils';

export const usePreviewEmailTemplate = ({ locale, payload }: { locale?: string; payload: string }) => {
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const subject = watch(`${path}.template.subject`);
  const contentType = watch(`${path}.template.contentType`);
  const htmlContent = watch(`${path}.template.htmlContent`);
  const editorContent = watch(`${path}.template.content`);
  const layoutId = watch(`${path}.template.layoutId`);

  const [previewState, setParsedPreviewState] = useState({
    subject: subject,
    content: '<html><head></head><body><div></div></body></html>',
  });
  const templateError = useStepFormCombinedErrors();

  const { isLoading, getEmailPreview } = usePreviewEmail({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.html,
        subject: result.subject,
      });
    },
  });

  const getEmailPreviewCallback = useCallback(
    (payloadArg: string) => {
      const content = contentType === 'editor' ? editorContent : htmlContent;
      if (!content) return;

      getEmailPreview({
        contentType: contentType,
        content,
        layoutId: layoutId,
        payload: parsePayload(payloadArg),
        subject: subject ?? '',
        locale,
      });
    },
    [contentType, editorContent, htmlContent, layoutId, subject, locale, getEmailPreview]
  );

  useEffect(() => {
    getEmailPreviewCallback(payload);
  }, [getEmailPreviewCallback, locale, payload]);

  const isPreviewContentLoading = !templateError && isLoading;

  return {
    getEmailPreview: getEmailPreviewCallback,
    previewContent: previewState.content,
    subject: previewState.subject,
    isPreviewContentLoading,
    templateError,
  };
};
