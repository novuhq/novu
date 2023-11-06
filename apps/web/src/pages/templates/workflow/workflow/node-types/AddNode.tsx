import { memo } from 'react';
import { ActionIcon, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';

import {
  Digest,
  Mail,
  Mobile,
  PlusCircleOutlined,
  Chat,
  Sms,
  InApp,
  Timer,
  colors,
  Dropdown,
  Text,
} from '@novu/design-system';
import { StepTypeEnum } from '@novu/shared';

interface NodeData {
  addNewNode: (parentId: string, type: string, childId?: string) => void;
  parentId: string;
  showDropZone: boolean;
  childId: string;
  readonly: boolean;
}
export default memo(({ data }: { data: NodeData }) => {
  const { parentId, childId } = data;
  const theme = useMantineTheme();
  const addNewNode = (type) => {
    data.addNewNode(data.parentId, type, data.childId);
  };

  const dataTestId = parentId && childId ? `addNodeButton_${parentId}_${childId}` : 'addNodeButton';

  if (data.readonly) {
    return null;
  }

  return (
    <Container data-test-id={dataTestId} style={{ pointerEvents: 'none' }}>
      <Dropdown
        position="right"
        middlewares={{ flip: false, shift: true }}
        withinPortal
        control={
          <ActionIcon
            data-test-id="button-add"
            sx={{
              '&:active': {
                color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
              },
              zIndex: 9999,
              pointerEvents: 'all',
              color: theme.colorScheme === 'dark' ? (data.showDropZone ? colors.white : colors.B60) : colors.B60,
              '&:hover': {
                color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
              },
            }}
            variant="transparent"
          >
            <PlusCircleOutlined fillColor={theme.colorScheme === 'dark' ? colors.B15 : 'transparent'} />
          </ActionIcon>
        }
      >
        <Dropdown.Item
          data-test-id={`add-in-app-node`}
          icon={<InApp />}
          onClick={() => addNewNode(StepTypeEnum.IN_APP)}
        >
          In-App
        </Dropdown.Item>
        <Dropdown.Item data-test-id={`add-email-node`} icon={<Mail />} onClick={() => addNewNode(StepTypeEnum.EMAIL)}>
          Email
        </Dropdown.Item>
        <Dropdown.Item data-test-id={`add-sms-node`} icon={<Sms />} onClick={() => addNewNode(StepTypeEnum.SMS)}>
          SMS
        </Dropdown.Item>
        <Dropdown.Item data-test-id={`add-chat-node`} icon={<Chat />} onClick={() => addNewNode(StepTypeEnum.CHAT)}>
          Chat
        </Dropdown.Item>
        <Dropdown.Item data-test-id={`add-push-node`} icon={<Mobile />} onClick={() => addNewNode(StepTypeEnum.PUSH)}>
          Push
        </Dropdown.Item>
        <Dropdown.Item
          data-test-id={`add-digest-node`}
          icon={
            /* Hack to manage the size of the SVG, which can't be changed with height and width attributes */
            <div style={{ zoom: 0.65, width: 28, marginLeft: 4 }}>
              <Digest color={theme.colorScheme === 'dark' ? colors.white : colors.B40} />
            </div>
          }
          onClick={() => addNewNode(StepTypeEnum.DIGEST)}
        >
          Digest
        </Dropdown.Item>
        <Dropdown.Item
          data-test-id={`add-delay-node`}
          icon={<Timer width={20} height={20} />}
          onClick={() => addNewNode(StepTypeEnum.DELAY)}
        >
          Delay
        </Dropdown.Item>
      </Dropdown>
      <Dropzone data-test-id="dropzone-area" dark={theme.colorScheme === 'dark'} visible={data.showDropZone}>
        <Text weight="bold" size="lg">
          Drag & Drop
        </Text>
        <Text mt={4} color={colors.B60}>
          Place your next step here
        </Text>
      </Dropzone>
    </Container>
  );
});

const Container = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
`;

const Dropzone = styled.div<{ dark: boolean; visible: boolean }>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  background: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  color: ${({ dark }) => (dark ? colors.B98 : colors.B17)};
  border-radius: 7px;
  text-align: center;
  border: 1px dashed ${({ dark }) => (dark ? colors.B30 : colors.B80)};
  cursor: none;
  width: 300px;
  height: 115px;
  margin-top: 20px;
  display: flex;
  justify-content: center;
  flex-direction: column;
`;
