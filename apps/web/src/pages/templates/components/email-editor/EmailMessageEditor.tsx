import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMantineTheme, Group, Container, Card } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { EmailBlockTypeEnum, IEmailBlock } from '@novu/shared';

import { Upload, colors, Text } from '@novu/design-system';
import { ContentRow } from './ContentRow';
import { ControlBar } from './ControlBar';
import { ButtonRowContent } from './ButtonRowContent';
import { TextRowContent } from './TextRowContent';
import type { IForm, IFormStep, ITemplates } from '../formTypes';
import { useStepFormPath } from '../../hooks/useStepFormPath';

interface IStepEntityExtended extends IFormStep {
  template: ITemplates & {
    content: IEmailBlock[];
  };
}

interface IFormExtended extends IForm {
  steps: IStepEntityExtended[];
}

export function EmailMessageEditor({
  branding,
  readonly,
}: {
  branding: { color: string; logo: string } | undefined;
  readonly: boolean;
}) {
  const methods = useFormContext<IFormExtended>();
  const stepFormPath = useStepFormPath();
  const contentBlocks = useFieldArray<IFormExtended, any, 'id' | 'type'>({
    control: methods.control,
    name: `${stepFormPath}.template.content` as any,
  });
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const [top, setTop] = useState<number>(0);
  const [controlBarVisible, setActionBarVisible] = useState<boolean>(false);

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

  function onBlockAdd(type: EmailBlockTypeEnum) {
    if (type === 'button') {
      contentBlocks.append({
        type: EmailBlockTypeEnum.BUTTON,
        content: 'Button text',
      });
    }

    if (type === 'text') {
      contentBlocks.append({
        type: EmailBlockTypeEnum.TEXT,
        content: '',
      });
    }
  }

  function removeBlock(index: number) {
    contentBlocks.remove(index);
  }

  if (!Array.isArray(contentBlocks.fields)) {
    return null;
  }

  function getBrandSettingsUrl(): string {
    return '/brand';
  }

  return (
    <Card withBorder sx={styledCard}>
      <Container pl={0} pr={0}>
        <div onClick={() => !branding?.logo && navigate(getBrandSettingsUrl())} role="link">
          <Dropzone
            styles={{
              inner: {
                height: '100%',
              },
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
            <Group position="center" style={{ height: '100%' }}>
              {!branding?.logo ? (
                <Group style={{ height: '100%', flexDirection: 'column' }} spacing={5} position="center">
                  <Upload style={{ width: 30, height: 30, color: colors.B60 }} />
                  <Text color={colors.B60}>Upload Brand Logo</Text>
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
          </Dropzone>
        </div>
      </Container>

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
          {contentBlocks.fields.map((block, blockIndex) => {
            return (
              <ContentRow
                key={blockIndex}
                onHoverElement={onHoverElement}
                onRemove={() => removeBlock(blockIndex)}
                allowRemove={contentBlocks.fields?.length > 1}
                blockIndex={blockIndex}
              >
                {block.type === 'text' ? (
                  <TextRowContent blockIndex={blockIndex} />
                ) : (
                  <ButtonRowContent brandingColor={branding?.color} blockIndex={blockIndex} />
                )}
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
  overflow: 'visible',
});
