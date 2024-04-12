import { errorMessage } from '@novu/design-system';
import { MimeTypesEnum } from '@novu/shared';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ProfileImage } from '../../../components/shared';

type FormValues = {
  logoUrl: string;
};

const MIME_TYPES = {
  'image/jpeg': MimeTypesEnum.JPEG,
  'image/png': MimeTypesEnum.PNG,
};

export function OrganizationLogo({ logoUrl }: { logoUrl?: string }) {
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
    // FIXME: Add organization logo api implementation once it is available
  }

  return (
    <form>
      <Controller
        name="logoUrl"
        control={control}
        render={({ field: { name, value } }) => (
          <ProfileImage
            name={name}
            value={value}
            onChange={handleUpload}
            // TODO: update isDisabled prop once the organization logo api is available
            isDisabled
          />
        )}
      />
    </form>
  );
}
