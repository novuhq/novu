import { Dropzone } from '@mantine/dropzone';
import { ActionButton, errorMessage, IconDelete, IconOutlineFileUpload } from '@novu/design-system';
import { UploadTypesEnum } from '@novu/shared';
import { useRef } from 'react';
import { ControllerRenderProps, UseFormSetValue } from 'react-hook-form';
import { useUploadToStorage } from '../../../../api/hooks/useUploadToStorage';
import { css, cx } from '../../../../styled-system/css';
import { Stack } from '../../../../styled-system/jsx';
import { ACCEPTABLE_ORG_IMAGE_TYPES, BRAND_LOGO_SIZE, IBrandFormValues } from './BrandingPage.const';
import {
  dropzoneOverlayStyles,
  dropzoneRootStyles,
  dropzoneTextStyles,
  dropzoneWrapperStyles,
  Text,
} from './BrandingPage.styles';

type BrandLogoUploadProps = {
  field: ControllerRenderProps<IBrandFormValues, 'logo'>;
  setValue: UseFormSetValue<IBrandFormValues>;
};

export function BrandLogoUpload({ field, setValue }: BrandLogoUploadProps) {
  const dropzoneRef = useRef<() => void>(null);

  const { uploadToStorage } = useUploadToStorage({
    onSuccess: (path) => {
      setValue('logo', path);
    },
    onError: (e) => {
      errorMessage('Failed to upload branding image: ' + e.message);
    },
  });

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    uploadToStorage({ file, type: UploadTypesEnum.BRANDING });
  };

  const removeFile = () => {
    setValue('file', null);
    setValue('logo', '');
  };

  return (
    /**
     * group className is used to target the dropzone overlay styles
     * REF: https://panda-css.com/docs/concepts/conditional-styles#group-selectors
     */
    <div className={cx('group', dropzoneWrapperStyles)}>
      {field.value && (
        <div className={dropzoneOverlayStyles}>
          <div>
            <ActionButton onClick={() => dropzoneRef.current?.()} Icon={IconOutlineFileUpload} />
            <Text className={dropzoneTextStyles}>Update</Text>
          </div>

          <div>
            <ActionButton onClick={removeFile} Icon={IconDelete} />
            <Text className={dropzoneTextStyles}>Remove</Text>
          </div>
        </div>
      )}
      <Dropzone
        classNames={{
          root: dropzoneRootStyles,
        }}
        openRef={dropzoneRef}
        accept={ACCEPTABLE_ORG_IMAGE_TYPES}
        multiple={false}
        onDrop={handleUpload}
        data-test-id="upload-image-button"
      >
        <div
          className={css({
            minHeight: BRAND_LOGO_SIZE,
            minWidth: BRAND_LOGO_SIZE,
            display: 'flex',
          })}
        >
          {field.value ? (
            <img
              data-test-id="logo-image-wrapper"
              src={field.value}
              className={css({
                minHeight: BRAND_LOGO_SIZE,
                minWidth: BRAND_LOGO_SIZE,
                objectFit: 'contain',
              })}
              alt="avatar"
            />
          ) : (
            <Stack gap="25" direction="column" align="center" justify="center" flexGrow={1}>
              <ActionButton onClick={() => dropzoneRef.current?.()} Icon={IconOutlineFileUpload} />
              <Text className={dropzoneTextStyles}>Upload</Text>
            </Stack>
          )}
        </div>
      </Dropzone>
    </div>
  );
}
