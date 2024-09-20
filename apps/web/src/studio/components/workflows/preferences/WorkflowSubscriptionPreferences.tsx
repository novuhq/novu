import { Switch } from '@mantine/core';
import { Table, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { ColorToken } from '@novu/novui/tokens';
import { ChannelTypeEnum, WorkflowPreferences } from '@novu/shared';
import { FC, useCallback, useMemo } from 'react';
import { PreferenceChannelName, SubscriptionPreferenceRow } from './types';
import { CHANNEL_LABELS_LOOKUP, CHANNEL_SETTINGS_LOGO_LOOKUP } from './WorkflowSubscriptionPreferences.const';
import { tableClassName } from './WorkflowSubscriptionPreferences.styles';

// these match react-table's specifications, but we don't have the types as a direct dependency in web.
const PREFERENCES_COLUMNS = [
  { accessorKey: 'channel', header: 'Channels', cell: ChannelCell },
  { accessorKey: 'enabled', header: 'Enabled', cell: SwitchCell },
  {
    accessorKey: 'readOnly',
    accessorFn: (row: SubscriptionPreferenceRow) => !row.readOnly,
    header: 'Editable',
    cell: SwitchCell,
  },
];

export type WorkflowSubscriptionPreferencesProps = {
  preferences: WorkflowPreferences;
  updateChannelPreferences: (prefs: WorkflowPreferences) => void;
  arePreferencesDisabled?: boolean;
};

export const WorkflowSubscriptionPreferences: FC<WorkflowSubscriptionPreferencesProps> = ({
  preferences,
  updateChannelPreferences,
  arePreferencesDisabled,
}) => {
  const onChange = useCallback(
    (channel: PreferenceChannelName, key: string, value: boolean) => {
      const updatedPreferences: WorkflowPreferences =
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

  const colorToken: ColorToken = props.row.original.enabled ? 'typography.text.main' : 'typography.text.secondary';

  return (
    <HStack color={colorToken} opacity={props.row.original.disabled ? 'disabled' : undefined}>
      {<Icon title="switch-channel-icon" color={'inherit'} />}
      <Text color={'inherit'}>{CHANNEL_LABELS_LOOKUP[props.getValue()]}</Text>
    </HStack>
  );
}

function SwitchCell(props) {
  return (
    <Switch
      // color prop does not work with 'var()' values
      classNames={{
        root: css({
          '&:has(:disabled)': { opacity: 'disabled' },
          '& input:not(:checked) + label': {
            bg: { _dark: 'legacy.B40 !important', base: 'legacy.B80 !important' },
          },
          '& input:checked + label': {
            bg: 'colorPalette.middle !important',
          },
        }),
        thumb: css({
          bg: 'legacy.white !important',
          border: 'none !important',
        }),
      }}
      checked={props.getValue()}
      onChange={(e) => {
        // readOnly is already negated
        const updatedVal = props.column.id === 'readOnly' ? !e.target.checked : e.target.checked;
        props.row.original.onChange(props.row.original.channel, props.column.id, updatedVal);
      }}
      size="lg"
      disabled={props.row.original.disabled}
    />
  );
}

function mapPreferencesToRows(
  workflowChannelPreferences: WorkflowPreferences | undefined,
  onChange: SubscriptionPreferenceRow['onChange'],
  areAllDisabled?: boolean
): SubscriptionPreferenceRow[] {
  if (!workflowChannelPreferences) {
    return [];
  }

  return [
    { ...workflowChannelPreferences.workflow, channel: 'workflow', onChange, disabled: areAllDisabled },
    ...Object.entries(workflowChannelPreferences.channels)
      .map(([channel, pref]) => ({
        ...pref,
        channel: channel as ChannelTypeEnum,
        onChange,
        disabled: areAllDisabled,
      }))
      .sort((preferenceA, preferenceB) => preferenceA.channel.localeCompare(preferenceB.channel)),
  ];
}
