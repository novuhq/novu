import { IEmailBlock } from '@novu/shared';
import { useMantineTheme, Group, Container, Card } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import React, { useEffect, useState } from 'react';
import { Upload } from '../../../design-system/icons';
import { colors, Text } from '../../../design-system';
import { ContentRow } from './ContentRow';
import { ControlBar } from './ControlBar';
import { ButtonRowContent } from './ButtonRowContent';
import { TextRowContent } from './TextRowContent';
import { useIsMounted } from '../../../hooks/use-is-mounted';
import { useNavigate } from 'react-router-dom';

export function EmailMessageEditor({
  onChange,
  value,
  branding,
  readonly,
}: {
  onChange?: (blocks: IEmailBlock[]) => void;
  value?: IEmailBlock[];
  branding: { color: string; logo: string } | undefined;
  readonly: boolean;
}) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState<IEmailBlock[]>(
    value?.length
      ? value
      : [
          {
            type: 'text',
            content: '',
          },
        ]
  );

  const isMounted = useIsMounted();

  const [top, setTop] = useState<number>(0);
  const [controlBarVisible, setActionBarVisible] = useState<boolean>(false);

  useEffect(() => {
    if (onChange && isMounted) {
      onChange(blocks);
    }
  }, [blocks, isMounted]);

  function onBlockStyleChanged(blockIndex: number, styles: { textDirection: 'rtl' | 'ltr' }) {
    blocks[blockIndex].styles = {
      ...styles,
    };

    setBlocks([...blocks]);
  }

  function onBlockTextChanged(blockIndex: number, content: string) {
    blocks[blockIndex].content = content;
    setBlocks([...blocks]);
  }

  function onBlockUrlChanged(blockIndex: number, url: string) {
    blocks[blockIndex].url = url;
    setBlocks([...blocks]);
  }

  function onHoverElement(e) {
    setTop(e.top + e.height);
  }

  function onEnterPress(e) {
    const ENTER_CODE = 13;
    const BACKSPACE_CODE = 8;

    if (e.keyCode === ENTER_CODE || e.keyCode === BACKSPACE_CODE) {
      /*
       * TODO: Currently disabled, because causes to not create new line on first time
       * setActionBarVisible(false);
       */
    }
  }

  function onBlockAdd(type: 'button' | 'text') {
    const modifiedBlocks = [...blocks];

    if (type === 'button') {
      modifiedBlocks.push({
        type: 'button',
        content: 'Button text',
      });
    }

    if (type === 'text') {
      modifiedBlocks.push({
        type: 'text',
        content: '',
      });
    }

    setBlocks(modifiedBlocks);
  }

  function removeBlock(index: number) {
    const modified = [...blocks];

    modified.splice(index, 1);
    setBlocks(modified);
  }

  if (!Array.isArray(blocks)) {
    return null;
  }

  function getBrandSettingsUrl(): string {
    return '/settings';
  }

  return (
    <Card withBorder sx={styledCard}>
      <div onClick={() => !branding?.logo && navigate(getBrandSettingsUrl())}>
        <Dropzone
          styles={{
            root: {
              borderRadius: '7px',
              padding: '10px',
              border: 'none',
              height: '80px',
              backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
            },
          }}
          disabled
          multiple={false}
          onDrop={(file) => {}}
          data-test-id="upload-image-button"
        >
          {(status) => (
            <Group position="center" style={{ height: '100%' }}>
              {!branding?.logo ? (
                <Group
                  style={{ height: '100%' }}
                  spacing={5}
                  position="center"
                  direction="column"
                  data-test-id="logo-upload-button"
                >
                  <Upload style={{ width: 30, height: 30, color: colors.B60 }} />
                  <Text color={theme.colorScheme === 'dark' ? colors.B40 : colors.B70}>Upload Brand Logo</Text>
                </Group>
              ) : (
                <img
                  data-test-id="brand-logo"
                  src={branding?.logo}
                  alt=""
                  style={{ width: 'inherit', maxHeight: '80%' }}
                />
              )}
            </Group>
          )}
        </Dropzone>
      </div>

      <Container
        mt={30}
        sx={{
          height: '100%',
          minHeight: '300px',
          borderRadius: '7px',
          padding: '30px',
          backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
          ...(readonly
            ? {
                backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.B98,
                color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70,
                opacity: 0.6,
              }
            : {}),
        }}
        onMouseEnter={() => setActionBarVisible(true)}
        onMouseLeave={() => setActionBarVisible(false)}
      >
        <div style={{ position: 'relative' }} data-test-id="email-editor">
          {blocks.map((block, index) => {
            return (
              <ContentRow
                onStyleChanged={(data) => onBlockStyleChanged(index, data)}
                key={index}
                block={block}
                onHoverElement={onHoverElement}
                onRemove={() => removeBlock(index)}
                allowRemove={blocks?.length > 1}
              >
                {[block.type].map((type, blockIndex) => {
                  if (type === 'text') {
                    return (
                      <TextRowContent
                        key={blockIndex}
                        block={block}
                        onTextChange={(text) => onBlockTextChanged(index, text)}
                      />
                    );
                  }
                  if (type === 'button') {
                    return (
                      <ButtonRowContent
                        key={blockIndex}
                        block={block}
                        brandingColor={branding?.color}
                        onUrlChange={(url) => onBlockUrlChanged(index, url)}
                        onTextChange={(text) => onBlockTextChanged(index, text)}
                      />
                    );
                  }

                  return <></>;
                })}
              </ContentRow>
            );
          })}
        </div>
        {controlBarVisible && !readonly && (
          <div>
            <ControlBar top={top} onBlockAdd={onBlockAdd} />
          </div>
        )}
      </Container>
    </Card>
  );
}

const styledCard = (theme) => ({
  backgroundColor: 'transparent',
  borderRadius: '7px',
  borderColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
  padding: '30px',
});
