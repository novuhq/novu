import { useMutation } from '@tanstack/react-query';
import { IResponseError } from '@novu/shared';

import { getSignedUrl, IGetSignedUrlParams, ISignedUrlResponse } from '../storage';

export const useGetSignedUrl = () => {
  const { mutateAsync: getSignedUrlMutation, ...mutationData } = useMutation<
    ISignedUrlResponse,
    IResponseError,
    IGetSignedUrlParams
  >(getSignedUrl);

  return { getSignedUrl: getSignedUrlMutation, ...mutationData };
};
