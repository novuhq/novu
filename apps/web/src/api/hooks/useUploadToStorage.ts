import { IResponseError, MIME_TYPE_TO_FILE_EXTENSION, UploadTypesEnum } from '@novu/shared';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import axios from 'axios';

import { useGetSignedUrl } from './useGetSignedUrl';

export const useUploadToStorage = (
  options: UseMutationOptions<string, IResponseError, { file: File; type: UploadTypesEnum }> = {}
) => {
  const { getSignedUrl } = useGetSignedUrl();
  const { mutateAsync: uploadToStorage, ...mutationData } = useMutation(
    async ({ file, type }) => {
      const { signedUrl, path, additionalHeaders } = await getSignedUrl({
        extension: MIME_TYPE_TO_FILE_EXTENSION[file.type],
        type,
      });
      await axios.put(signedUrl, file, {
        headers: {
          'Content-Type': file.type,
          ...additionalHeaders,
        },
        transformRequest: [
          (data, headers) => {
            if (headers) {
              // eslint-disable-next-line
              delete headers.Authorization;
            }

            return data;
          },
        ],
      });

      return path;
    },
    {
      ...options,
    }
  );

  return { uploadToStorage, ...mutationData };
};
