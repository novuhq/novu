import React, { ChangeEventHandler } from 'react';
import { IconPerson } from '@novu/design-system';
import { ControllerRenderProps } from 'react-hook-form';

import { previewContainerStyles } from './ProfileImage.styles';
import { UploadInput } from './UploadInput';

export interface ProfileImageProps {
  /**
   * **NOTE**: Value should be URL string
   */
  value?: string | null;
  /**
   * **NOTE**: convert the File value to string URL to display the image
   */
  onChange: ChangeEventHandler<HTMLInputElement>;
  name: ControllerRenderProps['name'];
  isDisabled?: boolean;
}

export const ProfileImage = React.forwardRef<HTMLInputElement, ProfileImageProps>(
  ({ name, onChange, value, isDisabled }, ref) => {
    return (
      <div className={previewContainerStyles} data-test-id="profile-image">
        {value ? (
          <img src={value} alt="image" data-test-id="preview-img" />
        ) : (
          <IconPerson size="72" data-test-id="person-icon" />
        )}
        {!isDisabled && <UploadInput ref={ref} name={name} onChange={onChange} />}
      </div>
    );
  }
);
