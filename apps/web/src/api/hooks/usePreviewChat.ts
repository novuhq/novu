import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { errorMessage } from '@novu/design-system';
import type { IResponseError } from '@novu/shared';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';

import { previewChat } from '../content-templates';

type PayloadType = {
  content?: string;
  payload: string;
  locale?: string;
};

type ResultType = { content: string };

export const usePreviewChat = (options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}) => {
  const { mutateAsync, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    ({ content, payload, locale }) => previewChat({ content, payload, locale }),
    {
      onError: (e) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
      },
    }
  );

  const getChatPreview = useCallback(
    async ({ content, payload, locale }: PayloadType) => {
      await mutateAsync({
        content,
        payload,
        locale,
      });
    },
    [mutateAsync]
  );

  return {
    getChatPreview,
    isLoading,
  };
};
