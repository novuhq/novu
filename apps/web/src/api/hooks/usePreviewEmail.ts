import { errorMessage } from '@novu/design-system';
import { IEmailBlock, MessageTemplateContentType } from '@novu/shared';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { previewEmail } from '../content-templates';

export type PayloadType = {
  content?: string | IEmailBlock[];
  contentType?: MessageTemplateContentType;
  payload: string;
  subject?: string;
  layoutId?: string;
  locale?: string;
};

export type ResultType = { html: string; subject: string };

type ErrorType = { error: string; message: string; statusCode: number };

export const usePreviewEmail = (options: UseMutationOptions<ResultType, ErrorType, PayloadType> = {}) => {
  const { mutateAsync, isLoading } = useMutation<ResultType, ErrorType, PayloadType>(
    ({ content, payload, contentType, layoutId, locale, subject }) =>
      previewEmail({ content, payload, contentType, layoutId, locale, subject }),

    {
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
      },
    }
  );

  const getEmailPreviewCallback = useCallback(
    async ({ content, payload, contentType, layoutId, locale, subject }: PayloadType) => {
      if (IS_DOCKER_HOSTED) {
        return;
      }

      await mutateAsync({
        content,
        payload,
        contentType,
        layoutId,
        locale,
        subject,
      });
    },
    [mutateAsync]
  );

  return {
    getEmailPreview: getEmailPreviewCallback,
    isLoading,
  };
};
