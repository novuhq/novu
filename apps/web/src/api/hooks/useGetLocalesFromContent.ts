import { errorMessage } from '@novu/design-system';
import type { IResponseError, IEmailBlock } from '@novu/shared';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getLocalesFromContent } from '../translations';

export interface ILocale {
  name: string;
  officialName: string | null;
  numeric: string;
  alpha2: string;
  alpha3: string;
  currencyName: string | null;
  currencyAlphabeticCode: string | null;
  langName: string;
  langIso: string;
}

type Payload = {
  content?: string | IEmailBlock[];
};

export const useGetLocalesFromContent = () => {
  const {
    mutateAsync: getLocalesFromContentMutation,
    isLoading,
    data,
  } = useMutation<ILocale[], IResponseError, Payload>(({ content }) => getLocalesFromContent({ content }), {
    onError: (e) => {
      errorMessage(e.message || 'Unexpected error');
    },
  });

  const getLocalesFromContentCallback = useCallback(
    async ({ content }: Payload) => {
      if (IS_DOCKER_HOSTED) {
        return;
      }

      await getLocalesFromContentMutation({
        content,
      });
    },
    [getLocalesFromContentMutation]
  );

  return {
    getLocalesFromContent: getLocalesFromContentCallback,
    isLoading,
    data: data || [],
  };
};
