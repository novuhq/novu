import { IEmailBlock } from '@notifire/shared';
import { useNavigate } from 'react-router-dom';
import { useMantineTheme, Group, Container, Card, Modal, Space } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import React, { useEffect, useState } from 'react';
import { Upload } from '../../../design-system/icons';
import { Button, colors, shadows, Text, Title } from '../../../design-system';
import { ContentRow } from './ContentRow';
import { ControlBar } from './ControlBar';
import { ButtonRowContent } from './ButtonRowContent';
import { TextRowContent } from './TextRowContent';

export function EmailMessageEditor({
  onChange,
  value,
  branding,
}: {
  onChange?: (blocks: IEmailBlock[]) => void;
  value?: IEmailBlock[];
  branding: { color: string; logo: string } | undefined;
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

  const [top, setTop] = useState<number>(0);
  const [controlBarVisible, setActionBarVisible] = useState<boolean>(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(blocks);
    }
  }, [blocks]);

  function onBlockStyleChanged(blockIndex: number, styles: { textDirection: 'rtl' | 'ltr' }) {
    blocks[blockIndex].styles = {
      ...styles,
    };

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

  function navigateToBrandSettings() {
    navigate('/settings/widget');
  }

  return (
    <Card withBorder sx={styledCard}>
      <div onClick={() => !branding?.logo && setConfirmModalVisible(true)}>
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
          data-test-id="upload-image-button">
          {(status) => (
            <Group position="center" style={{ height: '100%' }}>
              {!branding?.logo ? (
                <Group style={{ height: '100%' }} spacing={5} position="center" direction="column">
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
      <Modal
        onClose={() => setConfirmModalVisible(false)}
        opened={confirmModalVisible}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          },
          body: {
            paddingTop: '5px',
          },
          inner: {
            paddingTop: '180px',
          },
        }}
        title={<Title size={2}>Navigate to the settings page?</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg">
        <Text>Any unsaved changes will be deleted. Proceed anyway?</Text>
        <Group position="right">
          <Button variant="outline" size="md" mt={30} onClick={() => setConfirmModalVisible(false)}>
            No
          </Button>
          <Button mt={30} size="md" onClick={navigateToBrandSettings}>
            Yes
          </Button>
        </Group>
      </Modal>

      <Container
        mt={30}
        sx={{
          height: '100%',
          minHeight: '300px',
          borderRadius: '7px',
          padding: '30px',
          backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
        }}
        onMouseEnter={() => setActionBarVisible(true)}
        onMouseLeave={() => setActionBarVisible(false)}>
        <div style={{ position: 'relative' }}>
          {blocks.map((block, index) => {
            return (
              <ContentRow
                onStyleChanged={(data) => onBlockStyleChanged(index, data)}
                key={index}
                block={block}
                onHoverElement={onHoverElement}
                onRemove={() => removeBlock(index)}
                allowRemove={blocks?.length > 1}>
                {[block.type].map((type, blockIndex) => {
                  if (type === 'text') {
                    return (
                      <TextRowContent
                        key={blockIndex}
                        block={block}
                        onTextChange={(text) => {
                          // eslint-disable-next-line no-param-reassign
                          block.content = text;
                        }}
                      />
                    );
                  }
                  if (type === 'button') {
                    return (
                      <ButtonRowContent
                        key={blockIndex}
                        block={block}
                        brandingColor={branding?.color}
                        onUrlChange={(url) => {
                          // eslint-disable-next-line no-param-reassign
                          block.url = url;
                        }}
                        onTextChange={(text) => {
                          // eslint-disable-next-line no-param-reassign
                          block.content = text;
                        }}
                      />
                    );
                  }

                  return <></>;
                })}
              </ContentRow>
            );
          })}
        </div>
        {controlBarVisible && <ControlBar top={top} onBlockAdd={onBlockAdd} />}
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
