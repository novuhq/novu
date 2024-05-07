import React, { useImperativeHandle } from 'react';
import { IconOutlineFileUpload, Text } from '@novu/design-system';

import { ProfileImageProps } from './ProfileImage';
import { imageUploadStyles } from './ProfileImage.styles';
import { cx } from '../../styled-system/css';

export const UploadInput = React.forwardRef<HTMLInputElement, Omit<ProfileImageProps, 'value'>>(
  ({ name, onChange }, forwardedRef) => {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(forwardedRef, () => fileInputRef.current, []);

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
  }
);
