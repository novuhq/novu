import { createMemo, createSignal, Index, Show } from 'solid-js';

import { ChannelPreference, ChannelType, Preference } from '../../../../types';
import { useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { Collapsible } from '../../primitives/Collapsible';
import { ChannelRow } from './ChannelRow';
import { PreferencesRow } from './PreferencesRow';
import { Switch, SwitchState } from '../../primitives/Switch';
import { ArrowDropDown as DefaultArrowDropDown } from '../../../icons/ArrowDropDown';
import { NodeTree as DefaultNodeTree } from '../../../icons/NodeTree';
import { Info as DefaultInfo } from '../../../icons/Info';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

export const GroupedPreferencesRow = (props: {
  group: { name: string; preferences: Preference[] };
  updatePreference: (preference: Preference) => (channels: ChannelPreference) => void;
  bulkUpdatePreferences: (preferences: Preference[]) => (channels: ChannelPreference) => void;
}) => {
  const style = useStyle();
  const { t } = useLocalization();
  const [isOpened, setIsOpened] = createSignal(false);

  const uniqueChannels = createMemo(() => {
    return props.group.preferences.reduce(
      (acc, preference) => {
        Object.keys(preference.channels).forEach((el) => {
          const channel = el as keyof ChannelPreference;
          const currentState = acc[channel];
          const preferenceState = preference.channels[channel] ? 'enabled' : 'disabled';
          if (!currentState) {
            acc[channel] = preferenceState;
          } else {
            acc[channel] = currentState !== preferenceState ? 'indeterminate' : preferenceState;
          }
        });

        return acc;
      },
      {} as Record<keyof ChannelPreference, SwitchState>
    );
  });

  const groupState = createMemo(() => {
    const someIndeterminate = Object.values(uniqueChannels()).some((state) => state === 'indeterminate');
    if (someIndeterminate) {
      return 'indeterminate';
    }

    const allEnabled = Object.values(uniqueChannels()).every((state) => state === 'enabled');
    const allDisabled = Object.values(uniqueChannels()).every((state) => state === 'disabled');

    if (allEnabled) {
      return 'enabled';
    }

    if (allDisabled) {
      return 'disabled';
    }

    return 'indeterminate';
  });

  const updateGroupPreferences = (newState: SwitchState) => {
    const channels = Object.keys(uniqueChannels()).reduce((acc, channel) => {
      acc[channel as keyof ChannelPreference] = newState === 'enabled';

      return acc;
    }, {} as ChannelPreference);
    props.bulkUpdatePreferences(props.group.preferences)(channels);
  };

  const updatePreference = (workflowIdentifier?: string) => (channels: ChannelPreference) => {
    const preference = props.group.preferences.find((pref) => pref.workflow?.identifier === workflowIdentifier);
    if (!preference) return;

    props.updatePreference(preference)(channels);
  };

  const updatePreferencesForChannel = (channel: string) => (channels: ChannelPreference) => {
    const filteredPreferences = props.group.preferences.filter((preference) =>
      Object.keys(preference.channels).some((key) => key === channel)
    );

    props.bulkUpdatePreferences(filteredPreferences)(channels);
  };

  const preferences = createMemo(() => props.group.preferences);

  const nodeTreeIconClass = style('preferencesGroupLabelIcon', 'nt-text-foreground-alpha-600 nt-size-3.5');
  const infoIconClass = style('preferencesGroupInfoIcon', 'nt-size-4');
  const dropdownIconClass = style('moreTabs__icon', 'nt-size-4');

  return (
    <Show when={Object.keys(uniqueChannels()).length > 0}>
      <div
        class={style(
          'preferencesGroupContainer',
          `nt-bg-neutral-alpha-25 nt-rounded-lg nt-border nt-border-neutral-alpha-50`
        )}
        data-open={isOpened()}
      >
        <div
          class={style(
            'preferencesGroupHeader',
            'nt-flex nt-justify-between nt-p-2 nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center nt-overflow-hidden'
          )}
          onClick={() => {
            setIsOpened((prev) => !prev);
          }}
        >
          <div class={style('preferencesGroupLabelContainer', 'nt-overflow-hidden nt-flex nt-items-center nt-gap-1')}>
            <IconRendererWrapper
              iconKey="nodeTree"
              class={nodeTreeIconClass}
              fallback={<DefaultNodeTree class={nodeTreeIconClass} />}
            />
            <span
              class={style('preferencesGroupLabel', 'nt-text-sm nt-font-semibold nt-truncate nt-text-start')}
              data-open={isOpened()}
            >
              {props.group.name}
            </span>
          </div>
          <div class={style('preferencesGroupActionsContainer', 'nt-flex nt-items-center nt-gap-1')}>
            <Switch state={groupState()} onChange={updateGroupPreferences} />
            <span
              class={style(
                'preferencesGroupActionsContainerRight__icon',
                `nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180`
              )}
              data-open={isOpened()}
            >
              <IconRendererWrapper
                iconKey="arrowDropDown"
                class={dropdownIconClass}
                fallback={<DefaultArrowDropDown class={dropdownIconClass} />}
              />
            </span>
          </div>
        </div>
        <Collapsible open={isOpened()}>
          <div class={style('preferencesGroupBody', 'nt-flex nt-flex-col nt-gap-1 nt-overflow-hidden')}>
            <div
              class={style(
                'preferencesGroupChannels',
                'nt-flex nt-bg-background nt-border-t nt-border-b nt-border-neutral-alpha-50 nt-p-2 nt-flex-col nt-gap-1 nt-overflow-hidden'
              )}
            >
              <Index each={Object.keys(uniqueChannels())}>
                {(channel) => {
                  return (
                    <ChannelRow
                      channel={{
                        channel: channel() as ChannelType,
                        state: uniqueChannels()[channel() as keyof ChannelPreference],
                      }}
                      onChange={updatePreferencesForChannel(channel())}
                    />
                  );
                }}
              </Index>
              <span
                class={style(
                  'preferencesGroupInfo',
                  'nt-text-sm nt-text-start nt-text-foreground-alpha-400 nt-mt-1 nt-flex nt-items-center nt-gap-1'
                )}
                data-localization="preferences.group.info"
              >
                <IconRendererWrapper
                  iconKey="info"
                  class={infoIconClass}
                  fallback={<DefaultInfo class={infoIconClass} />}
                />
                {t('preferences.group.info')}
              </span>
            </div>
            <div class={style('preferencesGroupWorkflows', 'nt-flex nt-p-2 nt-flex-col nt-gap-1 nt-overflow-hidden')}>
              <Index each={preferences()}>
                {(preference) => (
                  <PreferencesRow iconKey="routeFill" preference={preference()} onChange={updatePreference} />
                )}
              </Index>
            </div>
          </div>
        </Collapsible>
      </div>
    </Show>
  );
};
