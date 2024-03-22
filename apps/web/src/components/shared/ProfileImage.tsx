import { IconOutlineFileUpload, IconPerson, Text } from '@novu/design-system';
import React from 'react';
import { Control } from 'react-hook-form';
import { cx } from '../../styled-system/css';

import { imageUploadStyles, previewContainerStyles } from './ProfileImage.styles';
import useProfileImageForm from './useProfileImageForm';
type ProfileImageProps = {
  /**
   * The URL of the image to display
   */
  imageUrl?: string;
  /**
   *
   * @param image The image file to submit
   * @returns A promise that resolves when the image is submitted
   */
  onImageSubmit: (image: File | null) => Promise<void>;

  /**
   * The react-hook-form control object
   */
  control: Control<any>;
  /**
   * The name of the image input field that is used in react-hook-form
   */
  name: string;
};

type UploadInputContainerProps = Pick<ProfileImageProps, 'control' | 'onImageSubmit' | 'name'>;

export function ProfileImage({ onImageSubmit, imageUrl, control, name }: ProfileImageProps) {
  return (
    <div className={previewContainerStyles} data-test-id="profile-image">
      {imageUrl ? (
        <img src={imageUrl} alt="image" data-test-id="preview-img" />
      ) : (
        <IconPerson size="76" data-test-id="person-icon" />
      )}
      <UploadInputContainer control={control} onImageSubmit={onImageSubmit} name={name} />
    </div>
  );
}

const UploadInputContainer = ({ control, onImageSubmit, name }: UploadInputContainerProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const { name: fieldName, onSubmit } = useProfileImageForm({ control, name, onSubmit: onImageSubmit });

  return (
    <div
      className={cx(imageUploadStyles, 'image-input')}
      onClick={handleUploadClick}
      data-test-id="image-input-container"
    >
      <IconOutlineFileUpload size="20" data-test-id="file-upload-icon" />
      <input
        type="file"
        hidden
        ref={fileInputRef}
        name={fieldName}
        onChange={onSubmit}
        accept="image/png, image/jpeg"
        data-test-id="image-file-input"
      />
      <Text data-test-id="upload-text">Upload</Text>
    </div>
  );
};
