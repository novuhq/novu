import { createMemo, createSignal, For, Show } from 'solid-js';
import { Preference } from '../../../preferences/preference';
import { ChannelPreference, ChannelType, PreferenceLevel } from '../../../types';
import { usePreferences } from '../../api';
import { useStyle } from '../../helpers';
import { ArrowDropDown } from '../../icons';
import { ChannelRow, getLabel } from './ChannelRow';
import { LoadingScreen } from './LoadingScreen';

export const Settings = () => {
  const style = useStyle();

  const { preferences, mutate } = usePreferences();

  const allPreferences = createMemo(() => {
    const globalPreference = preferences()?.find((preference) => preference.level === PreferenceLevel.GLOBAL);
    const workflowPreferences = preferences()?.filter((preference) => preference.level === PreferenceLevel.TEMPLATE);

    return { globalPreference, workflowPreferences };
  });

  const optimisticUpdate = ({
    channel,
    enabled,
    workflowId,
  }: {
    workflowId?: string;
    channel: ChannelType;
    enabled: boolean;
  }) => {
    mutate((prev) =>
      prev?.map((preference) => {
        if (preference.workflow?.id === workflowId || (!workflowId && preference.level === PreferenceLevel.GLOBAL)) {
          preference.channels[channel] = enabled;
        }

        return preference;
      })
    );
  };

  return (
    <div class={style('settingsContainer', 'nt-p-2 nt-flex nt-flex-col nt-gap-1 nt-bg-background nt-overflow-y-auto')}>
      <Show when={preferences.loading}>
        <LoadingScreen />
      </Show>
      <Show when={!preferences.loading && preferences()}>
        <SettingsRow
          label="Global Settings"
          channels={allPreferences().globalPreference?.channels || {}}
          onChange={optimisticUpdate}
        />

        <For each={allPreferences().workflowPreferences}>
          {(preference) => (
            <SettingsRow
              label={preference.workflow?.name as string}
              channels={preference.channels}
              workflowId={preference.workflow?.id}
              onChange={optimisticUpdate}
            />
          )}
        </For>
      </Show>
    </div>
  );
};

const ChannelsLabel = (props: { channels: ChannelPreference }) => {
  const style = useStyle();
  const definedKeys = () =>
    Object.keys(props.channels || {})
      .filter((key) => props.channels[key as keyof ChannelPreference] !== undefined)
      .map((key) => getLabel(key as ChannelType))
      .join(', ');

  return (
    <div class={style('channelDescription', 'nt-text-sm nt-text-foreground-alpha-600 nt-text-start')}>
      {definedKeys()}
    </div>
  );
};

const SettingsRow = (props: {
  label: string;
  channels: ChannelPreference;
  workflowId?: string;
  onChange: ({ channel, enabled, workflowId }: { workflowId?: string; channel: ChannelType; enabled: boolean }) => void;
}) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const style = useStyle();

  const channels = createMemo(() => Object.keys(props.channels || {}));

  return (
    <Show when={channels().length > 0}>
      <div class={style('workflowContainer', 'nt-p-4 nt-flex nt-flex-col nt-gap-1 nt-items-start nt-self-stretch')}>
        <div
          class={style(
            'workflowLabelContainer',
            'nt-flex nt-justify-between nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center'
          )}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <div>
            <div class={style('workflowLabel', 'nt-text-base nt-font-semibold nt-text-foreground nt-text-start')}>
              {props.label}
            </div>
            <ChannelsLabel channels={props.channels} />
          </div>
          <ArrowDropDown />
        </div>
        <Show when={isOpen()}>
          <div class={style('channelsContainer', 'nt-flex nt-flex-col nt-gap-1 nt-self-stretch')}>
            <For each={channels()}>
              {(channel) => (
                <ChannelRow
                  channel={channel as ChannelType}
                  enabled={!!props.channels[channel as keyof ChannelPreference]}
                  workflowId={props.workflowId}
                  onChange={props.onChange}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
};
