import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { errorMessage } from '@novu/design-system';
import type { IEmailBlock, IResponseError } from '@novu/shared';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';

import { previewSms } from '../content-templates';

type PayloadType = {
  content?: string | IEmailBlock[];
  payload: string;
  locale?: string;
};

type ResultType = { content: string };

export const usePreviewSms = (options: UseMutationOptions<ResultType, IResponseError, PayloadType> = {}) => {
  const { mutateAsync, isLoading } = useMutation<ResultType, IResponseError, PayloadType>(
    ({ content, payload, locale }) => previewSms({ content, payload, locale }),
    {
      onError: (e) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
      },
    }
  );

  const getSmsPreview = useCallback(
    async ({ content, payload, locale }: PayloadType) => {
      await mutateAsync({
        content,
        payload: JSON.parse(payload),
        locale,
      });
    },
    [mutateAsync]
  );

  return {
    getSmsPreview,
    isLoading,
  };
};
