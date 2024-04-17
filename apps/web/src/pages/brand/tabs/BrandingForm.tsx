import { Flex, Grid, Group, Input, LoadingOverlay, Stack, UnstyledButton, useMantineTheme } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { useOutletContext } from 'react-router-dom';
import { IResponseError, IOrganizationEntity, UploadTypesEnum, MIME_TYPE_TO_FILE_EXTENSION } from '@novu/shared';
import { Button, ColorInput, colors, Select, inputStyles, Upload, Trash, errorMessage } from '@novu/design-system';

import { updateBrandingSettings } from '../../../api/organization';
import Card from '../../../components/layout/components/Card';
import { successMessage } from '../../../utils/notifications';
import { useUploadToStorage } from '../../../api/hooks/useUploadToStorage';

/**
 * @deprecated Use `BrandingForm` from the v2 folder instead
 */
export function BrandingForm() {
  const { currentOrganization: organization } = useOutletContext<{
    currentOrganization: IOrganizationEntity | undefined;
  }>();
  const { uploadToStorage } = useUploadToStorage({
    onSuccess: (path) => {
      setValue('image', path);
    },
    onError: (e) => {
      errorMessage('Failed to upload branding image: ' + e.message);
    },
  });
  const { setValue, handleSubmit, control } = useForm({
    defaultValues: {
      fontFamily: organization?.branding?.fontFamily || 'inherit',
      color: organization?.branding?.color || '#f47373',
      image: organization?.branding?.logo || '',
      file: '',
    },
  });
  const theme = useMantineTheme();

  const { mutateAsync: updateBrandingSettingsMutation, isLoading: isUpdateBrandingLoading } = useMutation<
    { logo: string; path: string },
    IResponseError,
    { logo: string | undefined; color: string | undefined }
  >(updateBrandingSettings);

  useEffect(() => {
    if (organization) {
      organization?.branding?.logo ? setValue('image', organization.branding.logo) : setValue('image', '');
      organization?.branding?.color ? setValue('color', organization?.branding?.color) : setValue('color', '#f47373');
      organization?.branding?.fontFamily
        ? setValue('fontFamily', organization?.branding?.fontFamily)
        : setValue('fontFamily', 'inherit');
    }
  }, [organization, setValue]);

  function removeFile() {
    setValue('file', '');
    setValue('image', '');
  }

  async function handleUpload(files: File[]) {
    const file = files[0];
    if (!file) return;

    uploadToStorage({ file, type: UploadTypesEnum.BRANDING });
  }

  const dropzoneRef = useRef<() => void>(null);

  async function saveBrandsForm({ color, fontFamily, image }) {
    const brandData = {
      color,
      logo: image || null,
      fontFamily,
    };

    await updateBrandingSettingsMutation(brandData);

    successMessage('Branding info updated successfully');
  }

  return (
    <Stack h="100%">
      <LoadingOverlay visible={!organization} />
      <form noValidate onSubmit={handleSubmit(saveBrandsForm)}>
        <Grid>
          <Grid.Col span={6}>
            <Card title="Brand Setting" space={26}>
              <Stack spacing={40}>
                <Flex>
                  <Controller
                    render={({ field }) => (
                      <Input.Wrapper
                        styles={inputStyles}
                        label="Your Logo"
                        description="Will be used on email templates and inbox"
                      >
                        <DropzoneWrapper>
                          {field.value && (
                            <DropzoneOverlay>
                              <DropzoneButton type="button" onClick={() => dropzoneRef.current?.()}>
                                <Upload style={{ width: 20, height: 20 }} />
                                Update
                              </DropzoneButton>

                              <DropzoneButton type="button" onClick={removeFile}>
                                <Trash style={{ width: 20, height: 20 }} />
                                Remove
                              </DropzoneButton>
                            </DropzoneOverlay>
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
                            <Group
                              position="center"
                              spacing="xl"
                              style={{ minHeight: 100, minWidth: 100, pointerEvents: 'none' }}
                            >
                              {!field.value ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    color: colors.B60,
                                    gap: '4px',
                                  }}
                                >
                                  <Upload style={{ width: 20, height: 20 }} />
                                  Upload
                                </div>
                              ) : (
                                <img
                                  data-test-id="logo-image-wrapper"
                                  src={field.value}
                                  style={{ width: 100, height: 100, objectFit: 'contain' }}
                                  alt="avatar"
                                />
                              )}
                            </Group>
                          </Dropzone>
                        </DropzoneWrapper>
                      </Input.Wrapper>
                    )}
                    control={control}
                    name="image"
                  />
                </Flex>
                <div style={{ width: '50%' }}>
                  <Controller
                    render={({ field }) => (
                      <ColorInput
                        label="Font Color"
                        description="Will be used for text in the in-app widget"
                        data-test-id="color-picker"
                        disallowInput={false}
                        {...field}
                      />
                    )}
                    control={control}
                    name="color"
                  />
                </div>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={6}>
            {' '}
            <Card title="In-App Widget Customizations" space={26}>
              <Controller
                render={({ field }) => (
                  <Select
                    label="Font Family"
                    description="Will be used as the main font-family in the in-app widget"
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
                name="fontFamily"
              />
            </Card>
          </Grid.Col>
        </Grid>

        <div
          style={{
            textAlign: 'right',
            marginTop: '60px',
          }}
        >
          <Button submit loading={isUpdateBrandingLoading} data-test-id="submit-branding-settings">
            Update
          </Button>
        </div>
      </form>
    </Stack>
  );
}

const DropzoneButton: any = styled(UnstyledButton)`
  color: ${colors.B70};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:hover {
    color: ${colors.white};
  }
`;

const DropzoneOverlay = styled('div')`
  display: none;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  z-index: 20;
  border-radius: 7px;
  position: absolute;
  top: 0;
  left: 0;
  background-color: ${colors.BGDark + 'D6'};
  backdrop-filter: blur(5px);
  width: 100%;
  height: 100%;
`;

const DropzoneWrapper = styled('div')`
  position: relative;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5])};

  &:hover {
    cursor: pointer;

    ${DropzoneOverlay} {
      display: flex;
    }
  }
`;
