import { errorMessage, successMessage } from '@novu/design-system';
import { IResponseError, MimeTypesEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useUpdateOrganizationBranding } from '../../../api/hooks';
import { getSignedUrl } from '../../../api/storage';
import { ProfileImage } from '../../../components/shared';

type FormValues = {
  logoUrl: string;
};

const MIME_TYPES = {
  'image/jpeg': MimeTypesEnum.JPEG,
  'image/png': MimeTypesEnum.PNG,
};

export function OrganizationLogo({ logoUrl }: { logoUrl?: string }) {
  const { updateOrganizationBranding } = useUpdateOrganizationBranding({
    onSuccess: () => {
      successMessage('Logo updated');
    },
  });

  const { control, reset } = useForm<FormValues>({
    defaultValues: {
      logoUrl,
    },
  });

  /**
   * Reset the form when the organization changes
   * Useful in the scenario when the user switches to a different organization
   */
  useEffect(() => {
    reset({ logoUrl });
  }, [logoUrl, reset]);

  const { mutateAsync: getSignedUrlAction } = useMutation<
    { signedUrl: string; path: string; additionalHeaders: object },
    IResponseError,
    string
  >(getSignedUrl);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ? event.target.files[0] : null;

    if (!file) {
      return;
    }

    const fileExtension = file.type;
    const isValidFileType = MIME_TYPES[fileExtension] !== undefined;
    if (!isValidFileType) {
      errorMessage('Invalid file type. Please upload a PNG or JPEG file.');

      return;
    }

    const { signedUrl, path, additionalHeaders } = await getSignedUrlAction(MIME_TYPES[fileExtension]);

    await uploadImageToBucket(file, signedUrl, additionalHeaders);

    reset({ logoUrl: path });
    await updateOrganizationBranding({ logoUrl: path });
  }

  return (
    <form>
      <Controller
        name="logoUrl"
        control={control}
        render={({ field: { name, value } }) => <ProfileImage name={name} value={value} onChange={handleUpload} />}
      />
    </form>
  );
}

const uploadImageToBucket = async (file: File, signedUrl: string, additionalHeaders?: object) => {
  try {
    const fileExtension = file.type;
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
  } catch (error) {
    if (error instanceof Error) {
      errorMessage(error.message || 'Failed to upload image');
    }
  }
};
