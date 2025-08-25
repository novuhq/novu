import { createMemo, createSignal, Index, Show } from 'solid-js';
import { AppearanceCallback } from 'src/ui/types';
import { ChannelPreference, ChannelType, Preference } from '../../../../types';
import { useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowDropDown as DefaultArrowDropDown } from '../../../icons/ArrowDropDown';
import { Info as DefaultInfo } from '../../../icons/Info';
import { NodeTree as DefaultNodeTree } from '../../../icons/NodeTree';
import { Collapsible } from '../../primitives/Collapsible';
import { Switch, SwitchState } from '../../primitives/Switch';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';
import { ChannelRow } from './ChannelRow';
import { PreferencesRow } from './PreferencesRow';

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

  return (
    <Show when={Object.keys(uniqueChannels()).length > 0}>
      <div
        class={style({
          key: 'preferencesGroupContainer',
          className: 'nt-bg-neutral-alpha-25 nt-rounded-lg nt-border nt-border-neutral-alpha-50',
          context: {
            preferenceGroup: props.group,
          } satisfies Parameters<AppearanceCallback['preferencesGroupContainer']>[0],
        })}
        data-open={isOpened()}
      >
        <div
          class={style({
            key: 'preferencesGroupHeader',
            className:
              'nt-flex nt-justify-between nt-p-2 nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center nt-overflow-hidden',
            context: { preferenceGroup: props.group } satisfies Parameters<
              AppearanceCallback['preferencesGroupHeader']
            >[0],
          })}
          onClick={() => {
            setIsOpened((prev) => !prev);
          }}
        >
          <div
            class={style({
              key: 'preferencesGroupLabelContainer',
              className: 'nt-overflow-hidden nt-flex nt-items-center nt-gap-1',
              context: { preferenceGroup: props.group } satisfies Parameters<
                AppearanceCallback['preferencesGroupLabelContainer']
              >[0],
            })}
          >
            <IconRendererWrapper
              iconKey="nodeTree"
              class={style({
                key: 'preferencesGroupLabelIcon',
                className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                context: { preferenceGroup: props.group } satisfies Parameters<
                  AppearanceCallback['preferencesGroupLabelIcon']
                >[0],
              })}
              fallback={
                <DefaultNodeTree
                  class={style({
                    key: 'preferencesGroupLabelIcon',
                    className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                    context: { preferenceGroup: props.group } satisfies Parameters<
                      AppearanceCallback['preferencesGroupLabelIcon']
                    >[0],
                  })}
                />
              }
            />
            <span
              class={style({
                key: 'preferencesGroupLabel',
                className: 'nt-text-sm nt-font-semibold nt-truncate nt-text-start',
                context: { preferenceGroup: props.group } satisfies Parameters<
                  AppearanceCallback['preferencesGroupLabel']
                >[0],
              })}
              data-open={isOpened()}
            >
              {props.group.name}
            </span>
          </div>
          <div
            class={style({
              key: 'preferencesGroupActionsContainer',
              className: 'nt-flex nt-items-center nt-gap-1',
              context: { preferenceGroup: props.group } satisfies Parameters<
                AppearanceCallback['preferencesGroupActionsContainer']
              >[0],
            })}
          >
            <Switch state={groupState()} onChange={updateGroupPreferences} />
            <span
              class={style({
                key: 'preferencesGroupActionsContainerRight__icon',
                className:
                  'nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180',
                context: { preferenceGroup: props.group } satisfies Parameters<
                  AppearanceCallback['preferencesGroupActionsContainerRight__icon']
                >[0],
              })}
              data-open={isOpened()}
            >
              <IconRendererWrapper
                iconKey="arrowDropDown"
                class={style({
                  key: 'moreTabs__icon',
                  className: 'nt-size-4',
                })}
                fallback={
                  <DefaultArrowDropDown
                    class={style({
                      key: 'moreTabs__icon',
                      className: 'nt-size-4',
                    })}
                  />
                }
              />
            </span>
          </div>
        </div>
        <Collapsible open={isOpened()}>
          <div
            class={style({
              key: 'preferencesGroupBody',
              className: 'nt-flex nt-flex-col nt-gap-1 nt-overflow-hidden',
              context: { preferenceGroup: props.group } satisfies Parameters<
                AppearanceCallback['preferencesGroupBody']
              >[0],
            })}
          >
            <div
              class={style({
                key: 'preferencesGroupChannels',
                className:
                  'nt-flex nt-bg-background nt-border-t nt-border-b nt-border-neutral-alpha-50 nt-p-2 nt-flex-col nt-gap-1 nt-overflow-hidden',
                context: { preferenceGroup: props.group } satisfies Parameters<
                  AppearanceCallback['preferencesGroupChannels']
                >[0],
              })}
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
                      preferenceGroup={props.group}
                    />
                  );
                }}
              </Index>
              <span
                class={style({
                  key: 'preferencesGroupInfo',
                  className:
                    'nt-text-sm nt-text-start nt-text-foreground-alpha-400 nt-mt-1 nt-flex nt-items-center nt-gap-1',
                  context: { preferenceGroup: props.group } satisfies Parameters<
                    AppearanceCallback['preferencesGroupInfo']
                  >[0],
                })}
                data-localization="preferences.group.info"
              >
                <IconRendererWrapper
                  iconKey="info"
                  class={style({
                    key: 'preferencesGroupInfoIcon',
                    className: 'nt-size-4',
                    context: { preferenceGroup: props.group } satisfies Parameters<
                      AppearanceCallback['preferencesGroupInfoIcon']
                    >[0],
                  })}
                  fallback={
                    <DefaultInfo
                      class={style({
                        key: 'preferencesGroupInfoIcon',
                        className: 'nt-size-4',
                        context: { preferenceGroup: props.group } satisfies Parameters<
                          AppearanceCallback['preferencesGroupInfoIcon']
                        >[0],
                      })}
                    />
                  }
                />
                {t('preferences.group.info')}
              </span>
            </div>
            <div
              class={style({
                key: 'preferencesGroupWorkflows',
                className: 'nt-flex nt-p-2 nt-flex-col nt-gap-1 nt-overflow-hidden',
                context: { preferenceGroup: props.group } satisfies Parameters<
                  AppearanceCallback['preferencesGroupWorkflows']
                >[0],
              })}
            >
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
