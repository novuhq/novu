import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { IResponseError } from '@novu/shared';

import { getSignedUrl, IGetSignedUrlParams, ISignedUrlResponse } from '../storage';

export const useGetSignedUrl = (
  options: UseMutationOptions<ISignedUrlResponse, IResponseError, IGetSignedUrlParams> = {}
) => {
  const { mutateAsync: getSignedUrlMutation, ...mutationData } = useMutation<
    ISignedUrlResponse,
    IResponseError,
    IGetSignedUrlParams
  >(getSignedUrl, { ...options });

  return { getSignedUrl: getSignedUrlMutation, ...mutationData };
};
