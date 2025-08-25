import { createMemo, createSignal, Index, JSXElement, Show } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

import { RouteFill } from 'src/ui/icons/RouteFill';
import { ChannelPreference, ChannelType, Preference } from '../../../../types';
import { StringLocalizationKey, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Cogs, ArrowDropDown as DefaultArrowDropDown } from '../../../icons';
import { AppearanceCallback, AppearanceKey, IconKey } from '../../../types';
import { Collapsible } from '../../primitives/Collapsible';
import { SwitchState } from '../../primitives/Switch';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';
import { ChannelRow, getLabel } from './ChannelRow';

type IconComponentType = (props?: JSX.HTMLAttributes<SVGSVGElement>) => JSXElement;

const iconKeyToComponentMap: { [key in IconKey]?: IconComponentType } = {
  cogs: Cogs,
  routeFill: RouteFill,
};

export const PreferencesRow = (props: {
  iconKey: IconKey;
  preference: Preference;
  onChange: (workflowIdentifier?: string) => (channels: ChannelPreference) => void;
}) => {
  const style = useStyle();
  const [isOpenChannels, setIsOpenChannels] = createSignal(false);
  const { t } = useLocalization();

  const channels = createMemo(() =>
    Object.keys(props.preference?.channels ?? {}).map((channel) => ({
      channel: channel as ChannelType,
      state: props.preference?.channels[channel as keyof ChannelPreference] ? 'enabled' : ('disabled' as SwitchState),
    }))
  );

  const DefaultIconComponent = iconKeyToComponentMap[props.iconKey];

  return (
    <Show when={channels().length > 0}>
      <div
        class={style({
          key: 'workflowContainer',
          className: 'nt-p-1 nt-bg-neutral-alpha-25 nt-rounded-lg nt-border nt-border-neutral-alpha-50',
          context: {
            preference: props.preference,
          } satisfies Parameters<AppearanceCallback['workflowContainer']>[0],
        })}
        data-open={isOpenChannels()}
      >
        <div
          class={style({
            key: 'workflowLabelContainer',
            className:
              'nt-flex nt-justify-between nt-p-1 nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center nt-overflow-hidden',
            context: { preference: props.preference } satisfies Parameters<
              AppearanceCallback['workflowLabelContainer']
            >[0],
          })}
          onClick={() => {
            setIsOpenChannels((prev) => !prev);
          }}
        >
          <div
            class={style({
              key: 'workflowLabelHeader',
              className: 'nt-overflow-hidden',
              context: { preference: props.preference } satisfies Parameters<
                AppearanceCallback['workflowLabelHeader']
              >[0],
            })}
          >
            <div
              class={style({
                key: 'workflowLabelHeaderContainer',
                className: 'nt-flex nt-items-center nt-gap-1',
                context: { preference: props.preference } satisfies Parameters<
                  AppearanceCallback['workflowLabelHeaderContainer']
                >[0],
              })}
            >
              <IconRendererWrapper
                iconKey={props.iconKey}
                class={style({
                  key: 'workflowLabelIcon',
                  className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                  iconKey: 'cogs',
                  context: { preference: props.preference } satisfies Parameters<
                    AppearanceCallback['workflowLabelIcon']
                  >[0],
                })}
                fallback={
                  DefaultIconComponent &&
                  DefaultIconComponent({
                    class: style({
                      key: 'workflowLabelIcon',
                      className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                      iconKey: 'cogs',
                      context: { preference: props.preference } satisfies Parameters<
                        AppearanceCallback['workflowLabelIcon']
                      >[0],
                    }),
                  })
                }
              />
              <span
                class={style({
                  key: 'workflowLabel',
                  className: 'nt-text-sm nt-font-semibold nt-truncate nt-text-start',
                  context: { preference: props.preference } satisfies Parameters<
                    AppearanceCallback['workflowLabel']
                  >[0],
                })}
                data-localization={props.preference?.workflow?.identifier ?? 'preferences.global'}
                data-open={isOpenChannels()}
              >
                {t((props.preference?.workflow?.identifier as StringLocalizationKey) ?? 'preferences.global')}
              </span>
            </div>
            <Collapsible open={!isOpenChannels()}>
              <WorkflowDescription
                channels={props.preference?.channels ?? {}}
                appearanceKey="workflowDescription"
                class="nt-overflow-hidden"
                preference={props.preference}
              />
            </Collapsible>
          </div>
          <span
            class={style({
              key: 'workflowContainerRight__icon',
              className:
                'nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180',
              context: { preference: props.preference } satisfies Parameters<
                AppearanceCallback['workflowContainerRight__icon']
              >[0],
            })}
            data-open={isOpenChannels()}
          >
            <IconRendererWrapper
              iconKey="arrowDropDown"
              class={style({
                key: 'workflowArrow__icon',
                className: 'nt-text-foreground-alpha-600 nt-size-4',
                iconKey: 'arrowDropDown',
                context: { preference: props.preference } satisfies Parameters<
                  AppearanceCallback['workflowArrow__icon']
                >[0],
              })}
              fallback={
                <DefaultArrowDropDown
                  class={style({
                    key: 'workflowArrow__icon',
                    className: 'nt-text-foreground-alpha-600 nt-size-4',
                    iconKey: 'arrowDropDown',
                    context: { preference: props.preference } satisfies Parameters<
                      AppearanceCallback['workflowArrow__icon']
                    >[0],
                  })}
                />
              }
            />
          </span>
        </div>
        <Collapsible open={isOpenChannels()}>
          <div
            class={style({
              key: 'channelsContainer',
              className:
                'nt-flex nt-bg-background nt-border nt-border-neutral-alpha-200 nt-rounded-lg nt-p-2 nt-flex-col nt-gap-1 nt-overflow-hidden',
              context: { preference: props.preference } satisfies Parameters<
                AppearanceCallback['channelsContainer']
              >[0],
            })}
          >
            <Index each={channels()}>
              {(channel) => (
                <ChannelRow
                  channel={channel()}
                  workflowId={props.preference?.workflow?.id}
                  onChange={props.onChange(props.preference?.workflow?.identifier)}
                  preference={props.preference}
                />
              )}
            </Index>
          </div>
        </Collapsible>
      </div>
    </Show>
  );
};

type WorkflowDescriptionProps = JSX.IntrinsicElements['div'] & {
  channels: ChannelPreference;
  appearanceKey: AppearanceKey;
  preference: Preference;
};

const WorkflowDescription = (props: WorkflowDescriptionProps) => {
  const style = useStyle();

  const channelNames = () => {
    const channels = [];

    for (const key in props.channels) {
      if (props.channels[key as keyof ChannelPreference] !== undefined) {
        const isDisabled = !props.channels[key as keyof ChannelPreference];

        const element = (
          <span
            class={style({
              key: 'channelName',
              className: 'data-[disabled=true]:nt-text-foreground-alpha-400',
              context: { preference: props.preference } satisfies Parameters<AppearanceCallback['channelName']>[0],
            })}
            data-disabled={isDisabled}
          >
            {getLabel(key as ChannelType)}
          </span>
        );
        channels.push(element);
      }
    }

    return channels.map((c, index) => (
      <>
        {c}
        {index < channels.length - 1 && ', '}
      </>
    ));
  };

  return (
    <div
      class={style({
        key: props.appearanceKey,
        className: cn('nt-text-sm nt-text-foreground-alpha-600 nt-text-start', props.class),
      })}
    >
      {channelNames()}
    </div>
  );
};
