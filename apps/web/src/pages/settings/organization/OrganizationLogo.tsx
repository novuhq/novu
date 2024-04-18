import { errorMessage } from '@novu/design-system';
import { MIME_TYPE_TO_FILE_EXTENSION } from '@novu/shared';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ProfileImage } from '../../../components/shared';

type FormValues = {
  logoUrl: string;
};

export function OrganizationLogo({ logoUrl }: Partial<FormValues>) {
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
    const isValidFileType = !!MIME_TYPE_TO_FILE_EXTENSION[fileExtension];
    if (!isValidFileType) {
      errorMessage(`Invalid file type: ${fileExtension}. Please upload a PNG or JPEG file.`);

      return;
    }
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
