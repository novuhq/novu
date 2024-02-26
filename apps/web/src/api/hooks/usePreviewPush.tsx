import { errorMessage } from '@novu/design-system';
import { IEmailBlock } from '@novu/shared';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { previewPush } from '../content-templates';

type PayloadType = {
  content?: string | IEmailBlock[];
  payload: string;
  title?: string;
  locale?: string;
};

type ResultType = { content: string; title: string };

type ErrorType = { error: string; message: string; statusCode: number };

export const usePreviewPush = (options: UseMutationOptions<ResultType, ErrorType, PayloadType> = {}) => {
  const { mutateAsync, isLoading } = useMutation<ResultType, ErrorType, PayloadType>(
    ({ content, payload, locale, title }) => previewPush({ content, payload, locale, title }),

    {
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
      },
    }
  );

  const getPushPreviewCallback = useCallback(
    async ({ content, payload, locale, title }: PayloadType) => {
      await mutateAsync({
        content,
        payload: JSON.parse(payload),
        locale,
        title,
      });
    },
    [mutateAsync]
  );

  return {
    getPushPreview: getPushPreviewCallback,
    isLoading,
  };
};
