import { Switch } from '@mantine/core';
import { Table, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { ColorToken } from '@novu/novui/tokens';
import { ChannelTypeEnum, WorkflowChannelPreferences } from '@novu/shared';
import { FC, useCallback, useMemo } from 'react';
import { PreferenceChannelName, SubscriptionPreferenceRow } from './types';
import { CHANNEL_LABELS_LOOKUP, CHANNEL_SETTINGS_LOGO_LOOKUP } from './WorkflowSubscriptionPreferences.const';
import { tableClassName } from './WorkflowSubscriptionPreferences.styles';

// FIXME: determine how to bring in ReactTable types
const PREFERENCES_COLUMNS = [
  { accessorKey: 'channel', header: 'Channels', cell: ChannelCell },
  { accessorKey: 'defaultValue', header: 'Default', cell: SwitchCell },
  {
    accessorKey: 'readOnly',
    accessorFn: (row: SubscriptionPreferenceRow) => !row.readOnly,
    header: 'Editable',
    cell: SwitchCell,
  },
];

export type WorkflowSubscriptionPreferencesProps = {
  preferences: WorkflowChannelPreferences;
  updateChannelPreferences: (prefs: WorkflowChannelPreferences) => void;
  arePreferencesDisabled?: boolean;
};

export const WorkflowSubscriptionPreferences: FC<WorkflowSubscriptionPreferencesProps> = ({
  preferences,
  updateChannelPreferences,
  arePreferencesDisabled,
}) => {
  const onChange = useCallback(
    (channel: PreferenceChannelName, key: string, value: boolean) => {
      const updatedPreferences: WorkflowChannelPreferences =
        channel === 'workflow'
          ? {
              ...preferences,
              workflow: { ...preferences.workflow, [key]: value },
            }
          : {
              ...preferences,
              channels: {
                ...preferences.channels,
                [channel]: {
                  ...preferences.channels[channel],
                  [key]: value,
                },
              },
            };

      updateChannelPreferences(updatedPreferences);
    },
    [preferences, updateChannelPreferences]
  );

  const preferenceRows = useMemo(
    () => mapPreferencesToRows(preferences, onChange, arePreferencesDisabled),
    [preferences, onChange, arePreferencesDisabled]
  );

  return (
    <Table<SubscriptionPreferenceRow> className={tableClassName} columns={PREFERENCES_COLUMNS} data={preferenceRows} />
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

function SwitchCell(props) {
  return (
    <Switch
      classNames={{
        track: css({ bg: 'colorPalette.middle !important' }),
        root: css({ '&:has(:disabled)': { opacity: 'disabled' } }),
      }}
      checked={props.getValue()}
      onChange={(e) => {
        props.row.original.onChange(props.row.original.channel, props.column.id, e.currentTarget.value === 'on');
      }}
      size="lg"
      disabled={props.row.original.disabled}
    />
  );
}

function mapPreferencesToRows(
  workflowChannelPreferences: WorkflowChannelPreferences | undefined,
  onChange: SubscriptionPreferenceRow['onChange'],
  areAllDisabled?: boolean
): SubscriptionPreferenceRow[] {
  if (!workflowChannelPreferences) {
    return [];
  }

  return [
    { ...workflowChannelPreferences.workflow, channel: 'workflow', onChange, disabled: areAllDisabled },
    ...Object.entries(workflowChannelPreferences.channels).map(([channel, pref]) => ({
      ...pref,
      channel: channel as ChannelTypeEnum,
      onChange,
      disabled: areAllDisabled,
    })),
  ];
}
