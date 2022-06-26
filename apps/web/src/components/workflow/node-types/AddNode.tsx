import React, { memo } from 'react';
import { colors, Dropdown } from '../../../design-system';
import { ActionIcon, MenuItem as DropdownItem } from '@mantine/core';
import { Mail, Mobile, PlusCircleOutlined, Sms } from '../../../design-system/icons';
import { ChannelTypeEnum } from '@novu/shared';

interface NodeData {
  label: string;
  addNewNode: (parentId: string, type: string) => void;
  parentId: string;
}
export default memo(({ data }: { data: NodeData }) => {
  const addNewNode = (type) => {
    data.addNewNode(data.parentId, type);
  };

  return (
    <div data-test-id={`addNodeButton`} style={{ pointerEvents: 'none' }}>
      <Dropdown
        placement="center"
        control={
          <ActionIcon
            data-test-id="button-add"
            styles={(theme) => ({
              root: {
                '&:active': {
                  color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
                },
              },
              transparent: {
                zIndex: 9999,
                pointerEvents: 'all',
                color: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
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
      </Dropdown>
    </div>
  );
});
