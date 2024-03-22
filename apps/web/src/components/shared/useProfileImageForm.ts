import { errorMessage } from '@novu/design-system';
import React from 'react';
import { Control, useController } from 'react-hook-form';

export default function useProfileImageForm({
  control,
  name,
  onSubmit,
}: {
  control: Control<any>;
  name: string;
  onSubmit: (data: File | null) => Promise<void> | void;
}) {
  const { field, fieldState } = useController({
    name,
    control,
  });

  const handleOnSubmit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;

    // check if file is not an image
    if (file && !file.type.includes('image')) {
      errorMessage('Invalid file type');

      return;
    }

    field.onChange(e);
    onSubmit(file);
  };

  return {
    name: field.name,
    error: fieldState.error,
    onSubmit: handleOnSubmit,
  };
}
