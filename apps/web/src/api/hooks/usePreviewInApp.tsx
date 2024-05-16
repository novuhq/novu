import { errorMessage } from '@novu/design-system';
import { IMessageButton, IMessageCTA } from '@novu/shared';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { previewInApp } from '../content-templates';

type PayloadType = {
  content?: string;
  cta?: IMessageCTA;
  payload: string;
  locale?: string;
};

type ResultType = { content: string; ctaButtons: IMessageButton[] };

type ErrorType = { error: string; message: string; statusCode: number };

export const usePreviewInApp = (options: UseMutationOptions<ResultType, ErrorType, PayloadType> = {}) => {
  const { mutateAsync, isLoading } = useMutation<ResultType, ErrorType, PayloadType>(
    ({ content, payload, locale, cta }) => previewInApp({ content, payload, locale, cta }),

    {
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
      },
    }
  );

  const getInAppPreviewCallback = useCallback(
    async ({ content, payload, locale, cta }: PayloadType) => {
      await mutateAsync({
        content,
        payload,
        locale,
        cta,
      });
    },
    [mutateAsync]
  );

  return {
    getInAppPreview: getInAppPreviewCallback,
    isLoading,
  };
};
