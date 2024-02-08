import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { errorMessage } from '@novu/design-system';
import { IEmailBlock } from '@novu/shared';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';

import { previewSms } from '../content-templates';

type PayloadType = {
  content?: string | IEmailBlock[];
  payload: string;
  locale?: string;
};

type ResultType = { content: string };

type ErrorType = { error: string; message: string; statusCode: number };

export const usePreviewSms = (options: UseMutationOptions<ResultType, ErrorType, PayloadType> = {}) => {
  const { mutateAsync, isLoading } = useMutation<ResultType, ErrorType, PayloadType>(
    ({ content, payload, locale }) => previewSms({ content, payload, locale }),
    {
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
      onSuccess: (result, variables, context) => {
        options?.onSuccess?.(result, variables, context);
      },
    }
  );

  const getSmsPreview = useCallback(
    ({ content, payload, locale }: PayloadType) => {
      if (IS_DOCKER_HOSTED) {
        return;
      }

      return mutateAsync({
        content,
        payload,
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
