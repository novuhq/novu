import { IconOutlineFileUpload, IconPerson, Text } from '@novu/design-system';
import React from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { cx } from '../../styled-system/css';

import { imageUploadStyles, previewContainerStyles } from './ProfileImage.styles';

interface ProfileImageProps {
  /**
   * **NOTE**: Value should be URL string
   */
  value: string;

  /**
   * **NOTE**: convert the File value to string URL to display the image
   */
  onChange: ControllerRenderProps['onChange'];

  name: ControllerRenderProps['name'];
}

export function ProfileImage({ ...field }: ProfileImageProps) {
  return (
    <div className={previewContainerStyles} data-test-id="profile-image">
      {field.value ? (
        <img src={field.value} alt="image" data-test-id="preview-img" />
      ) : (
        <IconPerson size="76" data-test-id="person-icon" />
      )}
      <UploadInputContainer {...field} />
    </div>
  );
}

const UploadInputContainer = ({ ...field }: ProfileImageProps) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
        accept="image/png, image/jpeg"
        data-test-id="image-file-input"
        name={field.name}
        onChange={field.onChange}
      />
      <Text data-test-id="upload-text">Upload</Text>
    </div>
  );
};
