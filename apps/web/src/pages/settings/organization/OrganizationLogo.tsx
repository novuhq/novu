import { errorMessage, successMessage } from '@novu/design-system';
import { IResponseError } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useUpdateOrganizationBranding } from '../../../api/hooks';
import { getSignedUrl } from '../../../api/storage';
import { ProfileImage } from '../../../components/shared';

type FormValues = {
  logo: string;
};

const MIME_TYPES = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
};

export function OrganizationLogo({ logo }: { logo?: string }) {
  const { updateOrganizationBranding } = useUpdateOrganizationBranding();
  const { control, reset } = useForm<FormValues>({
    defaultValues: {
      logo: logo,
    },
  });

  const { mutateAsync: getSignedUrlAction } = useMutation<
    { signedUrl: string; path: string; additionalHeaders: object },
    IResponseError,
    string
  >(getSignedUrl);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files ? event.target.files[0] : null;

    if (!file) return;

    const fileExtension = file.type;
    const isValidFileType = MIME_TYPES[fileExtension] !== undefined;
    if (!isValidFileType) {
      errorMessage('Invalid file type. Please upload a PNG or JPEG file.');

      return;
    }

    const { signedUrl, path, additionalHeaders } = await getSignedUrlAction(MIME_TYPES[fileExtension]);
    const contentTypeHeaders = {
      'Content-Type': fileExtension,
    };

    const mergedHeaders = Object.assign({}, contentTypeHeaders, additionalHeaders || {});
    await axios.put(signedUrl, file, {
      headers: mergedHeaders,
      transformRequest: [
        (data, headers) => {
          if (headers) {
            delete headers.Authorization;
          }

          return data;
        },
      ],
    });

    await updateOrganizationBranding({ logo: path });
    reset({ logo: path });
    successMessage('Logo updated');
  }

  return (
    <form>
      <Controller
        name="logo"
        control={control}
        render={({ field }) => <ProfileImage {...field} onChange={handleUpload} />}
      />
    </form>
  );
}
