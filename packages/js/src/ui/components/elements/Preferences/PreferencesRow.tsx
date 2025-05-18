import { createMemo, createSignal, Index, JSXElement, Show } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

import { RouteFill } from 'src/ui/icons/RouteFill';
import { ChannelPreference, ChannelType, Preference } from '../../../../types';
import { StringLocalizationKey, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Cogs, ArrowDropDown as DefaultArrowDropDown } from '../../../icons';
import { AppearanceKey, IconKey, IconOverrides } from '../../../types';
import { Collapsible } from '../../primitives/Collapsible';
import { ChannelRow, getLabel } from './ChannelRow';
import { SwitchState } from '../../primitives/Switch';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

type IconComponentType = (props?: JSX.HTMLAttributes<SVGSVGElement>) => JSXElement;

const iconKeyToComponentMap: { [key in IconKey]?: IconComponentType } = {
  cogs: Cogs,
  routeFill: RouteFill,
};

export const PreferencesRow = (props: {
  iconKey: IconKey;
  preference?: Preference;
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

  const iconClass = style('workflowLabelIcon', 'nt-text-foreground-alpha-600 nt-size-3.5', {
    iconKey: 'cogs',
  });

  const arrowDropDownIconClass = style('workflowArrow__icon', 'nt-text-foreground-alpha-600 nt-size-4', {
    iconKey: 'arrowDropDown',
  });

  const DefaultIconComponent = iconKeyToComponentMap[props.iconKey];

  return (
    <Show when={channels().length > 0}>
      <div
        class={style(
          'workflowContainer',
          `nt-p-1 nt-bg-neutral-alpha-25 nt-rounded-lg nt-border nt-border-neutral-alpha-50`
        )}
        data-open={isOpenChannels()}
      >
        <div
          class={style(
            'workflowLabelContainer',
            'nt-flex nt-justify-between nt-p-1 nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center nt-overflow-hidden'
          )}
          onClick={() => {
            setIsOpenChannels((prev) => !prev);
          }}
        >
          <div class={style('workflowLabelHeader', 'nt-overflow-hidden')}>
            <div class={style('workflowLabelHeaderContainer', 'nt-flex nt-items-center nt-gap-1')}>
              <IconRendererWrapper
                iconKey={props.iconKey}
                class={iconClass}
                fallback={
                  DefaultIconComponent &&
                  DefaultIconComponent({
                    class: iconClass,
                  })
                }
              />
              <span
                class={style('workflowLabel', 'nt-text-sm nt-font-semibold nt-truncate nt-text-start')}
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
              />
            </Collapsible>
          </div>
          <span
            class={style(
              'workflowContainerRight__icon',
              `nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180`
            )}
            data-open={isOpenChannels()}
          >
            <IconRendererWrapper
              iconKey="arrowDropDown"
              class={arrowDropDownIconClass}
              fallback={<DefaultArrowDropDown class={arrowDropDownIconClass} />}
            />
          </span>
        </div>
        <Collapsible open={isOpenChannels()}>
          <div
            class={style(
              'channelsContainer',
              'nt-flex nt-bg-background nt-border nt-border-neutral-alpha-200 nt-rounded-lg nt-p-2 nt-flex-col nt-gap-1 nt-overflow-hidden'
            )}
          >
            <Index each={channels()}>
              {(channel) => (
                <ChannelRow
                  channel={channel()}
                  workflowId={props.preference?.workflow?.id}
                  onChange={props.onChange(props.preference?.workflow?.identifier)}
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
            class={style('channelName', 'data-[disabled=true]:nt-text-foreground-alpha-400')}
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
    <div class={style(props.appearanceKey, cn('nt-text-sm nt-text-foreground-alpha-600 nt-text-start', props.class))}>
      {channelNames()}
    </div>
  );
};
