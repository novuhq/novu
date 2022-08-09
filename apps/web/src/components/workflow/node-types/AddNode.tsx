import React, { memo } from 'react';
import { colors, Dropdown, Text } from '../../../design-system';
import { ActionIcon, MenuItem as DropdownItem, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { Mail, Mobile, PlusCircleOutlined, Sms } from '../../../design-system/icons';
import { ChannelTypeEnum } from '@novu/shared';
import { Digest } from '../../../design-system/icons/general/Digest';

interface NodeData {
  label: string;
  addNewNode: (parentId: string, type: string) => void;
  parentId: string;
  showDropZone: boolean;
}
export default memo(({ data }: { data: NodeData }) => {
  const theme = useMantineTheme();
  const addNewNode = (type) => {
    data.addNewNode(data.parentId, type);
  };

  return (
    <Container data-test-id={`addNodeButton`} style={{ pointerEvents: 'none' }}>
      <Dropdown
        placement="center"
        control={
          <ActionIcon
            data-test-id="button-add"
            styles={() => ({
              root: {
                '&:active': {
                  color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
                },
              },
              transparent: {
                zIndex: 9999,
                pointerEvents: 'all',
                color: theme.colorScheme === 'dark' ? (data.showDropZone ? colors.white : colors.B30) : colors.B80,
                '&:hover': {
                  color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
                },
              },
            })}
            variant="transparent"
          >
            <PlusCircleOutlined />
          </ActionIcon>
        }
      >
        <DropdownItem data-test-id={`add-sms-node`} icon={<Sms />} onClick={() => addNewNode(ChannelTypeEnum.SMS)}>
          SMS
        </DropdownItem>
        <DropdownItem data-test-id={`add-email-node`} icon={<Mail />} onClick={() => addNewNode(ChannelTypeEnum.EMAIL)}>
          Email
        </DropdownItem>
        <DropdownItem
          data-test-id={`add-in-app-node`}
          icon={<Mobile />}
          onClick={() => addNewNode(ChannelTypeEnum.IN_APP)}
        >
          In-App
        </DropdownItem>
        <DropdownItem
          data-test-id={`add-digest-node`}
          icon={
            /* Hack to manage the size of the SVG, which can't be changed with height and width attributes */
            <div style={{ zoom: 0.65, width: 28, marginLeft: 4 }}>
              <Digest color={theme.colorScheme === 'dark' ? colors.white : colors.B40} />
            </div>
          }
          onClick={() => addNewNode(ChannelTypeEnum.DIGEST)}
        >
          Digest
        </DropdownItem>
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
