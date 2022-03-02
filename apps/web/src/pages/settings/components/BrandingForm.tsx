import { IApplication } from '@notifire/shared';
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dropzone, DropzoneStatus } from '@mantine/dropzone';
import { useMutation } from 'react-query';
import axios from 'axios';
import { message } from 'antd';
import { useMantineTheme, Group, InputWrapper } from '@mantine/core';
import { Button, colors, Select, ColorInput } from '../../../design-system';
import { getSignedUrl } from '../../../api/storage';
import { updateBrandingSettings } from '../../../api/application';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { Upload } from '../../../design-system/icons';
import Card from '../../../components/layout/components/Card';

const mimeTypes = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
};

export function BrandingForm({ application }: { application: IApplication | undefined }) {
  const [fontFamily, setFontFamily] = useState<string>('Roboto');
  const [contentBackground, setContentBackground] = useState<string>('#efefef');
  const [fontColor, setFontColor] = useState<string>('#333737');
  const [color, setColor] = useState<string>('#f47373');
  const [image, setImage] = useState<string>();
  const [file, setFile] = useState<File>();
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const { mutateAsync: getSignedUrlAction } = useMutation<
    { signedUrl: string; path: string },
    { error: string; message: string; statusCode: number },
    string
  >(getSignedUrl);

  const { mutateAsync: updateBrandingSettingsMutation, isLoading: isUpdateBrandingLoading } = useMutation<
    { logo: string; path: string },
    { error: string; message: string; statusCode: number },
    { logo: string | undefined; color: string | undefined }
  >(updateBrandingSettings);

  useEffect(() => {
    if (application) {
      if (application.branding?.color) {
        setColor(application.branding.color);
      }

      if (application.branding?.logo) {
        setImage(application.branding.logo);
      }

      if (application.branding?.fontColor) {
        setFontColor(application.branding.fontColor);
      }

      if (application.branding?.contentBackground) {
        setContentBackground(application.branding.contentBackground);
      }

      if (application.branding?.fontFamily) {
        setFontFamily(application.branding.fontFamily);
      }
    }
  }, [application]);

  function beforeUpload(files: File[]) {
    setFile(files[0]);
  }

  useEffect(() => {
    if (file) {
      handleUpload();
    }
  }, [file]);

  async function handleUpload() {
    if (!file) return;

    setImageLoading(true);
    const { signedUrl, path } = await getSignedUrlAction(mimeTypes[file.type]);
    const response = await axios.put(signedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      transformRequest: [
        (data, headers) => {
          if (headers) {
            // eslint-disable-next-line
            delete headers.Authorization;
          }

          return data;
        },
      ],
    });

    setImage(path);
    setImageLoading(false);
  }

  async function saveBrandsForm() {
    const brandData = {
      color,
      logo: image,
      fontColor,
      contentBackground,
      fontFamily,
    };

    await updateBrandingSettingsMutation(brandData);

    message.success('Branding info updated successfully');
  }

  const { handleSubmit, control } = useForm({
    defaultValues: {
      fontFamily,
      fontColor,
      contentBackground,
      color,
      image: image || '',
      file: file || '',
    },
  });
  const theme = useMantineTheme();

  return (
    <form onSubmit={handleSubmit(saveBrandsForm)}>
      <Group grow spacing={50} mt={0} align="flex-start">
        <Card title="In-App Widget Customizations">
          <Controller
            render={({ field }) => (
              <Select
                label="Font Family"
                description="Will be used as the main font-family in the in-app widget"
                placeholder="Select a font family"
                data={['Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Oswald', 'Raleway']}
                data-test-id="font-family-selector"
                {...field}
              />
            )}
            control={control}
            name="fontFamily"
          />
          <Controller
            render={({ field }) => (
              <ColorInput
                mt={25}
                label="Font Color"
                description="Will be used for text in the in-app widget"
                data-test-id="font-color-picker-value"
                {...field}
              />
            )}
            control={control}
            name="fontColor"
          />
          <Controller
            render={({ field }) => (
              <ColorInput
                mt={25}
                label="Content Background Color"
                description="Will be used as the background color for the inner content of the in-app widget"
                data-test-id="content-background-picker-value"
                {...field}
              />
            )}
            control={control}
            name="contentBackground"
          />
        </Card>
        <Card title="Brand Setting">
          <Controller
            render={({ field }) => (
              <InputWrapper
                styles={inputStyles}
                label="Your Logo"
                description="Will be used on email templates and inbox">
                <Dropzone
                  styles={{
                    root: {
                      borderRadius: '7px',
                      width: '50%',
                      border: ` 1px solid ${
                        theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]
                      }`,
                    },
                  }}
                  accept={Object.keys(mimeTypes)}
                  multiple={false}
                  onDrop={beforeUpload}
                  {...field}
                  data-test-id="upload-image-button">
                  {(status) => dropzoneChildren(status, image)}
                </Dropzone>
              </InputWrapper>
            )}
            control={control}
            name="image"
          />
          <Controller
            render={({ field }) => (
              <ColorInput
                label="Brand Color"
                description="Will be used to style emails and inbox experience"
                data-test-id="color-picker"
                {...field}
              />
            )}
            control={control}
            name="color"
          />
        </Card>
      </Group>
      <Button submit mb={20} mt={25} loading={isUpdateBrandingLoading} data-test-id="submit-branding-settings">
        Update
      </Button>
    </form>
  );
}

export const dropzoneChildren = (status: DropzoneStatus, image) => (
  <Group position="center" spacing="xl" style={{ minHeight: 100, minWidth: 100, pointerEvents: 'none' }}>
    {!image ? (
      <Upload style={{ width: 80, height: 80, color: colors.B60 }} />
    ) : (
      <img data-test-id="logo-image-wrapper" src={image} style={{ width: '100%', height: 80 }} alt="avatar" />
    )}
  </Group>
);
