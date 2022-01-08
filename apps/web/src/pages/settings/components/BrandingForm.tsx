import { Button, Card, Form, Input, message, notification, Popover, Select, Upload } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { RcFile } from 'antd/lib/upload/interface';
import axios from 'axios';
import { BlockPicker } from 'react-color';
import styled from 'styled-components';
import { IApplication } from '@notifire/shared';
import { getSignedUrl } from '../../../api/storage';
import { updateBrandingSettings } from '../../../api/application';

const mimeTypes = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
};

export function BrandingForm({
  isLoading,
  application,
}: {
  isLoading: boolean;
  application: IApplication | undefined;
}) {
  const [fontFamily, setFontFamily] = useState<string>('Roboto');
  const [contentBackground, setContentBackground] = useState<string>('#efefef');
  const [fontColor, setFontColor] = useState<string>('#333737');
  const [color, setColor] = useState<string>('#f47373');
  const [image, setImage] = useState<string>();
  const [file, setFile] = useState<RcFile>();
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

  function beforeUpload(data: RcFile) {
    if (!mimeTypes[data.type]) {
      return false;
    }

    setFile(data);

    return false;
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
          // eslint-disable-next-line
          delete headers.common.Authorization;

          return data;
        },
      ],
    });

    setImage(path);
    setImageLoading(false);
  }

  async function saveBrandsForm() {
    if (!color || !image) {
      message.warning('Please provide a logo and a brand color');
      return;
    }

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

  return (
    <Card bordered title="Look and feel" style={{ marginBottom: 15 }} loading={isLoading}>
      <Form layout="vertical" onFinish={saveBrandsForm}>
        <Form.Item label="Logo" style={{ display: 'inline-block' }}>
          <p>
            <small>Your logo will be used on email templates and inbox</small>
          </p>
          <Upload
            accept={Object.keys(mimeTypes).join(', ')}
            name="avatar"
            listType="picture-card"
            data-test-id="upload-image-button"
            showUploadList={false}
            beforeUpload={beforeUpload}>
            {image ? (
              <img src={image} alt="avatar" style={{ width: '100%' }} />
            ) : (
              <div>
                {imageLoading ? <LoadingOutlined /> : <PlusOutlined />}
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Form.Item label="Brand Color">
          <p>
            <small>You brand color will be used to style emails and inbox experience</small>
          </p>
          <Popover
            trigger="click"
            content={
              <BlockPicker
                color={color}
                triangle="hide"
                onChange={(selectedColor) => {
                  setColor(selectedColor.hex);
                }}
              />
            }
            placement="topLeft">
            <Input
              disabled
              data-test-id="color-picker-value"
              addonAfter={
                <Popover
                  trigger="click"
                  content={
                    <BlockPicker
                      color={color}
                      triangle="hide"
                      onChange={(selectedColor) => {
                        setColor(selectedColor.hex);
                      }}
                    />
                  }
                  placement="topLeft">
                  <ColorPreview data-test-id="color-picker" $color={color} />
                </Popover>
              }
              style={{ maxWidth: 150 }}
              value={color}
            />
          </Popover>
        </Form.Item>

        <h3>In-app widget customizations</h3>
        <Form.Item label="Font Color">
          <p>
            <small>Font color will be used for text in the in-app widget</small>
          </p>
          <Popover
            trigger="click"
            content={
              <BlockPicker
                color={fontColor}
                triangle="hide"
                onChange={(selectedColor) => {
                  setFontColor(selectedColor.hex);
                }}
              />
            }
            placement="topLeft">
            <Input
              disabled
              data-test-id="font-color-picker-value"
              addonAfter={
                <Popover
                  trigger="click"
                  content={
                    <BlockPicker
                      data-test-id="font-color-block-picker"
                      color={fontColor}
                      triangle="hide"
                      onChange={(selectedColor) => {
                        setFontColor(selectedColor.hex);
                      }}
                    />
                  }
                  placement="topLeft">
                  <ColorPreview data-test-id="font-color-picker" $color={fontColor} />
                </Popover>
              }
              style={{ maxWidth: 150 }}
              value={fontColor}
            />
          </Popover>
        </Form.Item>

        <Form.Item label="Content Background Color">
          <p>
            <small>Will be used as the background color for the inner content of the in-app widget</small>
          </p>
          <Popover
            trigger="click"
            content={
              <BlockPicker
                color={contentBackground}
                triangle="hide"
                onChange={(selectedColor) => {
                  setContentBackground(selectedColor.hex);
                }}
              />
            }
            placement="topLeft">
            <Input
              disabled
              data-test-id="content-background-picker-value"
              addonAfter={
                <Popover
                  trigger="click"
                  content={
                    <BlockPicker
                      color={contentBackground}
                      triangle="hide"
                      onChange={(selectedColor) => {
                        setContentBackground(selectedColor.hex);
                      }}
                    />
                  }
                  placement="topLeft">
                  <ColorPreview data-test-id="content-background-picker" $color={contentBackground} />
                </Popover>
              }
              style={{ maxWidth: 150 }}
              value={contentBackground}
            />
          </Popover>
        </Form.Item>
        <Form.Item label="Font Family">
          <p>
            <small>Will be used as the main font-family in the in-app widget</small>
          </p>
          <Select
            showSearch
            data-test-id="font-family-selector"
            style={{ width: 200 }}
            value={fontFamily}
            placeholder="Select a font family"
            optionFilterProp="children"
            onChange={(value) => setFontFamily(value as string)}
            filterOption={(input, option) => option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
            <Select.Option value="Roboto">Roboto</Select.Option>
            <Select.Option value="Montserrat">Montserrat</Select.Option>
            <Select.Option value="Open Sans">Open Sans</Select.Option>
            <Select.Option value="Lato">Lato</Select.Option>
            <Select.Option value="Nunito">Nunito</Select.Option>
            <Select.Option value="Oswald">Oswald</Select.Option>
            <Select.Option value="Raleway">Raleway</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button
            loading={isUpdateBrandingLoading}
            type="primary"
            htmlType="submit"
            style={{ float: 'right' }}
            data-test-id="submit-branding-settings">
            Update
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

const ColorPreview = styled.div<{ $color: string }>`
  width: 15px;
  height: 15px;
  border-radius: 2px;
  background-color: ${({ $color }) => $color};

  &:hover {
    cursor: pointer;
  }
`;
