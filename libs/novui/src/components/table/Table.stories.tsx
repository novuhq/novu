import { Badge, Switch } from '@mantine/core';
import { Meta, StoryFn } from '@storybook/react';
import React, { useState } from 'react';

import { ColumnDef } from '@tanstack/react-table';
import { css } from '../../../styled-system/css';
import { HStack, Stack } from '../../../styled-system/jsx';
import { ColorToken } from '../../../styled-system/tokens';
import {
  IconAdUnits,
  IconCopyAll,
  IconDynamicFeed,
  IconManageAccounts,
  IconNotificationsNone,
  IconOutlineAdd,
  IconOutlineForum,
  IconOutlineMailOutline,
  IconOutlineSms,
  IconType,
} from '../../icons';
import { Button, IconButton } from '../Button';
import { Input } from '../input';
import { Tabs } from '../tabs';
import { Text } from '../Text';
import { Table } from './Table';

export default {
  title: 'Components/Table',
  component: Table,
  argTypes: {
    data: {
      control: false,
    },
    columns: {
      control: false,
    },
  },
} as Meta<typeof Table>;

const SwitchCell = (props) => {
  const [status, setStatus] = useState(props.status);
  const switchHandler = () => {
    setStatus((prev) => (prev === 'Enabled' ? 'Disabled' : 'Enabled'));
  };

  return <Switch size={'lg'} onChange={switchHandler} checked={status === 'Enabled'} />;
};

const BadgeCell = (props) => {
  return (
    <Badge variant="outline" size="md" radius="xs">
      {props.getValue()}
    </Badge>
  );
};

interface IExampleData {
  name: string;
  category: string;
  creationDate: string;
  status: string;
}

const data: IExampleData[] = [
  { name: 'Great', category: 'Fun', status: 'Disabled', creationDate: '01/01/2021 16:36' },
  { name: 'Whats up?', category: 'Done', status: 'Enabled', creationDate: '01/01/2021 16:36' },
];

const columns: ColumnDef<PreferencesData>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'category', header: 'Category', cell: BadgeCell },
  { accessorKey: 'creationDate', header: 'Date Created' },
  { accessorKey: 'status', header: 'Status', cell: SwitchCell },
];

const Template: StoryFn<typeof Table> = ({ ...args }) => (
  <>
    <Button Icon={IconOutlineAdd} variant="transparent" py="50">
      Add row
    </Button>
    <Table {...args} />
  </>
);

export const PrimaryUse = Template.bind({});
PrimaryUse.args = { columns, data };

const ChannelCell = (props) => {
  const Icon = CHANNEL_SETTINGS_LOGO_LOOKUP[props.getValue()];

  // FIXME: clean this up with a recipe & check if text is only white if both are enabled
  const colorToken: ColorToken = props.row.original.defaultValue ? 'typography.text.main' : 'typography.text.secondary';

  return (
    <HStack>
      {/* {<Icon title="switch-channel-icon" color={token(`colors.${colorToken}`)} />} */}
      {<Icon title="switch-channel-icon" color={colorToken} />}
      <Text color={colorToken}>{props.getValue()}</Text>
    </HStack>
  );
};

const PreferencesSwitchCell = (props) => {
  return <Switch size={'lg'} checked={props.getValue()} />;
};

// FIXME: point this at actual enum / channel type
type Channel = string;
type SettingChannel = Channel | 'Workflow';

type PreferencesData = {
  channel: SettingChannel;
  defaultValue: boolean;
  editable: boolean;
};

const preferencesColumns: ColumnDef<PreferencesData>[] = [
  { accessorKey: 'channel', header: 'Channels', cell: ChannelCell },
  { accessorKey: 'defaultValue', header: 'Default', cell: PreferencesSwitchCell },
  { accessorKey: 'editable', header: 'Editable', cell: PreferencesSwitchCell },
];

const preferencesData: PreferencesData[] = [
  { channel: 'Workflow', defaultValue: true, editable: true },
  { channel: 'In-App', defaultValue: true, editable: false },
  { channel: 'Email', defaultValue: false, editable: false },
  { channel: 'SMS', defaultValue: true, editable: true },
  { channel: 'Push', defaultValue: false, editable: false },
  { channel: 'Chat', defaultValue: true, editable: true },
];

// FIXME: use proper channel enum | 'Workflow'
const CHANNEL_SETTINGS_LOGO_LOOKUP: Record<SettingChannel, IconType> = {
  Workflow: IconDynamicFeed,
  'In-App': IconNotificationsNone,
  Email: IconOutlineMailOutline,
  SMS: IconOutlineSms,
  Push: IconAdUnits,
  Chat: IconOutlineForum,
};

const PreferencesTemplate: StoryFn<typeof Table> = ({ ...args }) => {
  return (
    <Tabs
      defaultValue={'metadata'}
      tabConfigs={[
        {
          value: 'metadata',
          label: 'Metadata',
          icon: <IconDynamicFeed />,
          content: (
            <Stack gap="150">
              <Input label="Workflow name" />
              <Input
                label="Identifier"
                description="Must be unique and all lowercase, using - only"
                rightSection={<IconButton Icon={IconCopyAll} />}
              />
              <Input label="Description" />
            </Stack>
          ),
        },
        {
          value: 'subscriber',
          label: 'Subscriber',
          icon: <IconManageAccounts />,
          content: (
            <Stack gap="150">
              <Text color="typography.text.secondary">
                Set default notification channels for subscribers, and determine which channels they can modify
                themselves.
              </Text>
              <Table {...args} />
            </Stack>
          ),
        },
      ]}
    />
  );
};

export const PreferencesTable = PreferencesTemplate.bind({});
PreferencesTable.args = {
  columns: preferencesColumns,
  data: preferencesData,
  className: css({
    '& td': {
      py: '75',
    },
    '& tbody tr': {
      '&:first-of-type td': {
        borderBottom: 'solid',
        borderColor: 'table.header.border',
        // FIXME: Talk to Design about this. We're using a table but then breaking every rule
        py: '100',
      },
      '&:not(:first-of-type) td': {
        borderBottom: 'none',
      },
    },
    '& tbody tr td': {
      height: '[inherit]',
    },
    '& tbody tr:last-of-type td': {
      borderBottom: 'solid',
    },
    '& tr td:not(:first-child), & tr th:not(:first-child)': {
      pr: '0',
      pl: '175',
      // FIXME: width for switch columns should be based on content
      width: '[34px]',
    },
    _hover: {
      '& tbody tr:hover': {
        bg: '[initial]',
      },
    },
  }),
};
