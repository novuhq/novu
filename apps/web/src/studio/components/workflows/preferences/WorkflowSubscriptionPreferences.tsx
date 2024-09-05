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
import { FC } from 'react';
import { Switch } from '@novu/design-system';
import { PreferenceChannel, SubscriptionPreferenceRow } from './types';
import { tableClassName } from './WorkflowSubscriptionPreferences.styles';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { useStudioState } from '../../../hooks';

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
  updateChannelPreferences: (preference: SubscriptionPreferenceRow) => void;
  channelPreferencesLoading: boolean;
};

export const WorkflowSubscriptionPreferences: FC<WorkflowSubscriptionPreferencesProps> = ({
  preferences,
  updateChannelPreferences,
}) => {
  const onChange = (channel: PreferenceChannel, key: string, value: boolean) => {
    const preference = preferences.find((item) => item.channel === channel);

    if (!preference) {
      return;
    }

    preference[key] = value;

    updateChannelPreferences(preference);
  };

  return (
    <Table<
      SubscriptionPreferenceRow & {
        onChange: (channel: PreferenceChannel, key: string, value: boolean) => void;
      }
    >
      className={tableClassName}
      columns={PREFERENCES_COLUMNS}
      data={preferences.map((item) => ({ ...item, onChange }))}
    />
  );
};

function ChannelCell(props) {
  const Icon = CHANNEL_SETTINGS_LOGO_LOOKUP[props.getValue()];

  const colorToken: ColorToken = props.row.original.defaultValue ? 'typography.text.main' : 'typography.text.secondary';

  return (
    <HStack color={colorToken}>
      {<Icon title="switch-channel-icon" color={'inherit'} />}
      <Text color={'inherit'}>{CHANNEL_LABELS_LOOKUP[props.getValue()]}</Text>
    </HStack>
  );
}

function DefaultValueSwitchCell(props) {
  const { isLocalStudio } = useStudioState() || {};

  return (
    <Switch
      checked={props.getValue()}
      onChange={(e) => {
        props.row.original.onChange(props.row.original.channel, props.column.id, e.currentTarget.value === 'on');
      }}
      disabled={isLocalStudio}
    />
  );
}

function ReadOnlySwitchCell(props) {
  const { isLocalStudio } = useStudioState() || {};

  return (
    <Switch
      checked={!props.getValue()}
      onChange={(e) => {
        props.row.original.onChange(props.row.original.channel, props.column.id, e.currentTarget.value !== 'on');
      }}
      disabled={isLocalStudio}
    />
  );
}
