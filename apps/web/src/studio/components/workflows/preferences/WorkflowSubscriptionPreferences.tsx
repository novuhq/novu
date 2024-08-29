import { css } from '@novu/novui/css';
import {
  IconAdUnits,
  IconDynamicFeed,
  IconNotificationsNone,
  IconOutlineForum,
  IconOutlineMailOutline,
  IconOutlineSms,
  IconType,
} from '@novu/novui/icons';
import { Table, Text } from '@novu/novui';
import { HStack } from '@novu/novui/jsx';
import { ColorToken } from '@novu/novui/tokens';
import { ChannelTypeEnum } from '@novu/shared';
import { Switch } from '@mantine/core';
import { FC } from 'react';

type PreferenceChannel = ChannelTypeEnum | 'Workflow';

/**
 * This is subject to change based on the data provided by API / framework
 * and Figma designs as they will dictate the controls / state we need available
 */
type ChannelSubscriptionPreference = {
  channel: PreferenceChannel;
  defaultValue: boolean;
  editable: boolean;
};

const CHANNEL_SETTINGS_LOGO_LOOKUP: Record<PreferenceChannel, IconType> = {
  Workflow: IconDynamicFeed,
  [ChannelTypeEnum.IN_APP]: IconNotificationsNone,
  [ChannelTypeEnum.EMAIL]: IconOutlineMailOutline,
  [ChannelTypeEnum.SMS]: IconOutlineSms,
  [ChannelTypeEnum.PUSH]: IconAdUnits,
  [ChannelTypeEnum.CHAT]: IconOutlineForum,
};

// FIXME: determine how to bring in types
const PREFERENCES_COLUMNS = [
  { accessorKey: 'channel', header: 'Channels', cell: ChannelCell },
  { accessorKey: 'defaultValue', header: 'Default', cell: PreferencesSwitchCell },
  { accessorKey: 'editable', header: 'Editable', cell: PreferencesSwitchCell },
];

type WorkflowSubscriptionPreferencesProps = {
  // channelPreferences: Record<PreferenceChannel, ChannelSubscriptionPreference>;
  // updateChannelPreferences: (prefs: Partial<Record<PreferenceChannel, ChannelSubscriptionPreference>>) => Promise<void>;
};
export const WorkflowSubscriptionPreferences: FC<WorkflowSubscriptionPreferencesProps> = (props) => {
  return (
    <Table<ChannelSubscriptionPreference>
      className={tableClassName}
      columns={PREFERENCES_COLUMNS}
      data={preferencesData}
    />
  );
};

const preferencesData: ChannelSubscriptionPreference[] = [
  { channel: 'Workflow', defaultValue: true, editable: true },
  { channel: ChannelTypeEnum.IN_APP, defaultValue: true, editable: false },
  { channel: ChannelTypeEnum.EMAIL, defaultValue: false, editable: false },
  { channel: ChannelTypeEnum.SMS, defaultValue: true, editable: true },
  { channel: ChannelTypeEnum.PUSH, defaultValue: false, editable: false },
  { channel: ChannelTypeEnum.CHAT, defaultValue: true, editable: true },
];

const tableClassName = css({
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
});

function ChannelCell(props) {
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
}

function PreferencesSwitchCell(props) {
  return <Switch size={'lg'} checked={props.getValue()} />;
}
