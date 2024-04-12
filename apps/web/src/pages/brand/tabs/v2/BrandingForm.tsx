import { Dropzone } from '@mantine/dropzone';
import {
  ActionButton,
  Button,
  ColorInput,
  colors,
  errorMessage,
  IconDelete,
  IconOutlineFileUpload,
  LoadingOverlay,
  Select,
  Text,
} from '@novu/design-system';
import { IResponseError, MIME_TYPE_TO_FILE_EXTENSION, UploadTypesEnum } from '@novu/shared';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAuthContext } from '@novu/shared-web';
import { useUpdateOrganizationBranding } from '../../../../api/hooks';
import { useUploadToStorage } from '../../../../api/hooks/useUploadToStorage';
import { css, cx } from '../../../../styled-system/css';
import { Stack } from '../../../../styled-system/jsx';
import { successMessage } from '../../../../utils/notifications';
import { SettingsPageContainer } from '../../../settings/SettingsPageContainer';
import { dropzoneOverlayStyles, dropzoneWrapperStyles } from './BrandingForm.styles';

const DEFAULT_BRANDING_COLOR = '#f47373';

type BrandFormValues = {
  fontFamilyValue: string;
  brandColorValue: string;
  fontColorValue: string;
  brandLogoUrl: string;
  file: File | null;
};

export function BrandingForm() {
  const { currentOrganization: organization } = useAuthContext();
  const dropzoneRef = useRef<() => void>(null);

  const { uploadToStorage } = useUploadToStorage({
    onSuccess: (path) => {
      setValue('brandLogoUrl', path);
    },
    onError: (e) => {
      errorMessage('Failed to upload branding image: ' + e.message);
    },
  });

  const { setValue, handleSubmit, control } = useForm<BrandFormValues>({
    defaultValues: {
      fontFamilyValue: organization?.branding?.fontFamily || 'inherit',
      brandColorValue: organization?.branding?.color || DEFAULT_BRANDING_COLOR,
      fontColorValue: organization?.branding?.fontColor || DEFAULT_BRANDING_COLOR,
      brandLogoUrl: organization?.branding?.logo || '',
      file: null,
    },
  });

  const { isLoading, updateOrganizationBranding } = useUpdateOrganizationBranding({
    onSuccess: () => {
      successMessage('Branding info updated successfully');
    },
    onError: (e: IResponseError) => {
      errorMessage(e.message || 'Failed to update branding info');
    },
  });

  const removeFile = () => {
    setValue('file', null);
    setValue('brandLogoUrl', '');
  };

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    uploadToStorage({ file, type: UploadTypesEnum.BRANDING });
  };

  const saveBrandsForm = async ({
    brandColorValue,
    brandLogoUrl,
    fontColorValue,
    fontFamilyValue,
  }: BrandFormValues) => {
    const payload = {
      brandColorValue,
      brandLogoUrl: brandLogoUrl || undefined,
      fontColorValue,
      fontFamilyValue,
    };

    await updateOrganizationBranding(payload);
  };

  return (
    <SettingsPageContainer title="Branding">
      <LoadingOverlay visible={!organization}>
        <form noValidate onSubmit={handleSubmit(saveBrandsForm)}>
          <Stack gap={32}>
            <Stack gap={10}>
              <Text weight="bold">Brand logo</Text>
              <Controller
                render={({ field }) => (
                  /**
                   * group classname is used to target the dropzone overlay styles
                   * REF: https://panda-css.com/docs/concepts/conditional-styles#group-selectors
                   */
                  <div className={cx('group', dropzoneWrapperStyles)}>
                    {field.value && (
                      <div className={dropzoneOverlayStyles}>
                        <div>
                          <ActionButton onClick={() => dropzoneRef.current?.()} Icon={IconOutlineFileUpload} />
                          <Text color={colors.B70}>Update</Text>
                        </div>

                        <div>
                          <ActionButton onClick={removeFile} Icon={IconDelete} />
                          <Text color={colors.B70}>Remove</Text>
                        </div>
                      </div>
                    )}
                    <Dropzone
                      styles={{
                        root: {
                          background: 'none',
                          border: 'none',
                        },
                      }}
                      openRef={dropzoneRef}
                      accept={Object.keys(MIME_TYPE_TO_FILE_EXTENSION)}
                      multiple={false}
                      onDrop={handleUpload}
                      data-test-id="upload-image-button"
                    >
                      <div
                        className={css({
                          minHeight: '6.25rem',
                          minWidth: '6.25rem',
                          display: 'flex',
                        })}
                      >
                        {!field.value ? (
                          <Stack gap="4px" direction="column" align="center" justify="center" flexGrow={1}>
                            <ActionButton onClick={() => dropzoneRef.current?.()} Icon={IconOutlineFileUpload} />
                            <Text color={colors.B70}>Upload</Text>
                          </Stack>
                        ) : (
                          <img
                            data-test-id="logo-image-wrapper"
                            src={field.value}
                            className={css({
                              minHeight: '6.25rem',
                              minWidth: '6.25rem',
                              objectFit: 'contain',
                            })}
                            alt="avatar"
                          />
                        )}
                      </div>
                    </Dropzone>
                  </div>
                )}
                control={control}
                name="brandLogoUrl"
              />
            </Stack>

            <div style={{ width: '15rem' }}>
              <Controller
                render={({ field }) => (
                  <ColorInput label="Brand color" data-test-id="brand-color-picker" disallowInput={false} {...field} />
                )}
                control={control}
                name="brandColorValue"
              />
            </div>

            <div style={{ width: '15rem' }}>
              <Controller
                render={({ field }) => (
                  <Select
                    label="In-App font family"
                    placeholder="Select a font family"
                    data={[
                      'inherit',
                      'Fira Code',
                      'Roboto',
                      'Montserrat',
                      'Open Sans',
                      'Lato',
                      'Nunito',
                      'Oswald',
                      'Raleway',
                    ]}
                    data-test-id="font-family-selector"
                    {...field}
                  />
                )}
                control={control}
                name="fontFamilyValue"
              />
            </div>

            <div style={{ width: '15rem' }}>
              <Controller
                render={({ field }) => (
                  <ColorInput
                    label="In-App font color"
                    data-test-id="font-color-picker"
                    disallowInput={false}
                    {...field}
                  />
                )}
                control={control}
                name="fontColorValue"
              />
            </div>
          </Stack>

          <div
            className={css({
              textAlign: 'right',
              marginTop: '60px',
            })}
          >
            <Button submit loading={isLoading} data-test-id="submit-branding-settings" px="4rem">
              Update
            </Button>
          </div>
        </form>
      </LoadingOverlay>
    </SettingsPageContainer>
  );
}
