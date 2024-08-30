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
import { Preference, PreferenceChannel, SubscriptionPreferenceRow } from './types';
import { tableClassName } from './WorkflowSubscriptionPreferences.styles';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';

const CHANNEL_SETTINGS_LOGO_LOOKUP: Record<PreferenceChannel, IconType> = {
  workflow: IconDynamicFeed,
  [ChannelTypeEnum.IN_APP]: IconNotificationsNone,
  [ChannelTypeEnum.EMAIL]: IconOutlineMailOutline,
  [ChannelTypeEnum.SMS]: IconOutlineSms,
  [ChannelTypeEnum.PUSH]: IconAdUnits,
  [ChannelTypeEnum.CHAT]: IconOutlineForum,
};

const CHANNEL_LABELS_LOOKUP: Record<PreferenceChannel, string> = {
  ...CHANNEL_TYPE_TO_STRING,
  workflow: 'Workflow',
};

// FIXME: determine how to bring in ReactTable types
const PREFERENCES_COLUMNS = [
  { accessorKey: 'channel', header: 'Channels', cell: ChannelCell },
  { accessorKey: 'defaultValue', header: 'Default', cell: DefaultValueSwitchCell },
  { accessorKey: 'readOnly', header: 'Editable', cell: ReadOnlySwitchCell },
];

export type WorkflowSubscriptionPreferencesProps = {
  preferences: SubscriptionPreferenceRow[];
  updateChannelPreferences: (prefs: Partial<Record<PreferenceChannel, Preference>>) => Promise<void>;
};
export const WorkflowSubscriptionPreferences: FC<WorkflowSubscriptionPreferencesProps> = ({ preferences }) => {
  // FIXME: setup on toggle behaviors
  return (
    <Table<SubscriptionPreferenceRow> className={tableClassName} columns={PREFERENCES_COLUMNS} data={preferences} />
  );
};

function ChannelCell(props) {
  const Icon = CHANNEL_SETTINGS_LOGO_LOOKUP[props.getValue()];

  // FIXME: clean this up with a recipe & check if text is only white if both are enabled
  const colorToken: ColorToken = props.row.original.defaultValue ? 'typography.text.main' : 'typography.text.secondary';

  return (
    <HStack color={colorToken}>
      {<Icon title="switch-channel-icon" color={'inherit'} />}
      <Text color={'inherit'}>{CHANNEL_LABELS_LOOKUP[props.getValue()]}</Text>
    </HStack>
  );
}

function DefaultValueSwitchCell(props) {
  return <Switch size={'lg'} checked={props.getValue()} />;
}

function ReadOnlySwitchCell(props) {
  return <Switch size={'lg'} checked={!props.getValue()} />;
}
