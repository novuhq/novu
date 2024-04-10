import { IconOutlineFileUpload, IconPerson, Text } from '@novu/design-system';
import React from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { cx } from '../../styled-system/css';

import { imageUploadStyles, previewContainerStyles } from './ProfileImage.styles';

interface ProfileImageProps {
  /**
   * **NOTE**: Value should be URL string
   */
  value?: string | null;

  /**
   * **NOTE**: convert the File value to string URL to display the image
   */
  onChange: ControllerRenderProps['onChange'];

  name: ControllerRenderProps['name'];
}

export function ProfileImage({ name, onChange, value }: ProfileImageProps) {
  return (
    <div className={previewContainerStyles} data-test-id="profile-image">
      {value ? (
        <img src={value} alt="image" data-test-id="preview-img" />
      ) : (
        <IconPerson size="76" data-test-id="person-icon" />
      )}
      <UploadInputContainer name={name} onChange={onChange} />
    </div>
  );
}

const UploadInputContainer = ({ name, onChange }: Omit<ProfileImageProps, 'value'>) => {
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
        name={name}
        onChange={onChange}
      />
      <Text data-test-id="upload-text">Upload</Text>
    </div>
  );
};
