import { Switch } from '@mantine/core';
import { Table, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack, VStack } from '@novu/novui/jsx';
import { ColorToken } from '@novu/novui/tokens';
import { ChannelTypeEnum, WorkflowPreferences } from '@novu/shared';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { IconInfoOutline, Tooltip, When } from '@novu/design-system';
import { PreferenceChannelName, SubscriptionPreferenceRow } from './types';
import { CHANNEL_LABELS_LOOKUP, CHANNEL_SETTINGS_LOGO_LOOKUP } from './WorkflowSubscriptionPreferences.const';
import { tableClassName } from './WorkflowSubscriptionPreferences.styles';

const switchClassNames = {
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
};

// these match react-table's specifications, but we don't have the types as a direct dependency in web.
const PREFERENCES_COLUMNS = [
  { accessorKey: 'channel', header: 'Channels', cell: ChannelCell },
  { accessorKey: 'enabled', header: 'Enabled', cell: SwitchCell },
];

export type WorkflowSubscriptionPreferencesProps = {
  preferences: WorkflowPreferences;
  updateWorkflowPreferences: (prefs: WorkflowPreferences | null) => void;
  arePreferencesDisabled?: boolean;
  hasWorkflowPreferences?: boolean;
};

export const WorkflowSubscriptionPreferences: FC<WorkflowSubscriptionPreferencesProps> = ({
  preferences,
  updateWorkflowPreferences,
  arePreferencesDisabled,
  hasWorkflowPreferences,
}) => {
  const [isOverridingPreferences, setIsOverridingPreferences] = useState(hasWorkflowPreferences === true);
  const isDisabled = arePreferencesDisabled || !isOverridingPreferences;

  const onChange = useCallback(
    (channel: PreferenceChannelName, key: string, value: boolean) => {
      let updatedPreferences: WorkflowPreferences;

      if (channel === 'all') {
        const updatedChannels = Object.keys(preferences.channels).reduce(
          (acc, currChannel) => {
            acc[currChannel] = { ...preferences.channels[currChannel], [key]: value };

            return acc;
          },
          {} as WorkflowPreferences['channels']
        );

        updatedPreferences = {
          ...preferences,
          all: { ...preferences.all, [key]: value },
          channels: updatedChannels,
        };
      } else {
        const updatedChannels = {
          ...preferences.channels,
          [channel]: {
            ...preferences.channels[channel],
            [key]: value,
          },
        };

        const allChannelsFalse = Object.values(updatedChannels).every((channelPreferences) => !channelPreferences[key]);

        updatedPreferences = {
          ...preferences,
          all: { ...preferences.all, [key]: !allChannelsFalse },
          channels: updatedChannels,
        };
      }

      updateWorkflowPreferences(updatedPreferences);
    },
    [preferences, updateWorkflowPreferences]
  );

  useEffect(() => {
    if (isOverridingPreferences === false) {
      updateWorkflowPreferences(null);
    }
  }, [isOverridingPreferences, updateWorkflowPreferences]);

  const preferenceRows = useMemo(
    () => mapPreferencesToRows(preferences, onChange, isDisabled),
    [preferences, onChange, isDisabled]
  );

  return (
    <VStack alignItems="inherit" gap="200">
      <When truthy={!arePreferencesDisabled}>
        <HStack justify="space-between">
          <HStack>
            <Text>Override Preferences</Text>
            <Tooltip label={'Override the default preferences for this workflow'}>
              <span>
                <IconInfoOutline size={16} />
              </span>
            </Tooltip>
          </HStack>
          <Switch
            size="lg"
            classNames={switchClassNames}
            checked={isOverridingPreferences}
            onChange={(e) => setIsOverridingPreferences(e.target.checked)}
          />
        </HStack>
      </When>
      <HStack justify="space-between">
        <HStack
          color={preferences?.all?.readOnly ? 'typography.text.main' : 'typography.text.secondary'}
          opacity={isDisabled ? 'disabled' : undefined}
        >
          <Text color="inherit">Critical</Text>
          <Tooltip label={'Mark the workflow as critical, preventing Subscribers from editing their preference'}>
            <span>
              <IconInfoOutline size={16} color="inherit" />
            </span>
          </Tooltip>
        </HStack>
        <Switch
          size="lg"
          classNames={switchClassNames}
          onChange={(e) => onChange('all', 'readOnly', e.target.checked)}
          disabled={isDisabled}
          checked={preferences?.all?.readOnly}
        />
      </HStack>
      <Table<SubscriptionPreferenceRow>
        className={tableClassName}
        columns={PREFERENCES_COLUMNS}
        data={preferenceRows}
      />
    </VStack>
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
      classNames={switchClassNames}
      checked={props.getValue()}
      onChange={(e) => {
        const updatedVal = e.target.checked;
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
    { ...workflowChannelPreferences.all, channel: 'all', onChange, disabled: areAllDisabled },
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
