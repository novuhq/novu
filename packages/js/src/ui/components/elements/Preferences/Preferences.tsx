import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { ChannelPreference, ChannelType, PreferenceLevel } from '../../../../types';
import { usePreferences } from '../../../api';
import { setDynamicLocalization } from '../../../config';
import { StringLocalizationKey, useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowDropDown, Lock } from '../../../icons';
import { Tooltip } from '../../primitives/Tooltip';
import { ChannelRow, getLabel } from './ChannelRow';
import { LoadingScreen } from './LoadingScreen';

/* This is also going to be exported as a separate component. Keep it pure. */
export const Preferences = () => {
  const style = useStyle();

  const { preferences, loading, mutate } = usePreferences();

  const allPreferences = createMemo(() => {
    const globalPreference = preferences()?.find((preference) => preference.level === PreferenceLevel.GLOBAL);
    const workflowPreferences = preferences()?.filter((preference) => preference.level === PreferenceLevel.TEMPLATE);

    return { globalPreference, workflowPreferences };
  });

  createEffect(() => {
    // Register the names as localizable
    setDynamicLocalization((prev) => ({
      ...prev,
      ...allPreferences().workflowPreferences?.reduce<Record<string, string>>((acc, preference) => {
        acc[preference.workflow!.identifier] = preference.workflow!.name;

        return acc;
      }, {}),
    }));
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
    <div
      class={style(
        'preferencesContainer',
        'nt-p-2 nt-flex nt-flex-col nt-gap-1 nt-bg-background nt-overflow-y-auto nt-h-full'
      )}
    >
      <Show when={loading()}>
        <LoadingScreen />
      </Show>
      <Show when={!loading() && preferences()}>
        <PreferencesRow
          localizationKey="preferences.global"
          channels={allPreferences().globalPreference?.channels || {}}
          onChange={optimisticUpdate}
        />

        <For each={allPreferences().workflowPreferences}>
          {(preference) => (
            <PreferencesRow
              localizationKey={preference.workflow!.identifier as StringLocalizationKey}
              channels={preference.channels}
              workflowId={preference.workflow?.id}
              onChange={optimisticUpdate}
              isCritical={preference.workflow?.critical}
            />
          )}
        </For>
      </Show>
    </div>
  );
};

const ChannelsLabel = (props: { channels: ChannelPreference }) => {
  const style = useStyle();

  const channelNames = () => {
    const channels = [];

    for (const key in props.channels) {
      if (props.channels[key as keyof ChannelPreference] !== undefined) {
        const isDisabled = !props.channels[key as keyof ChannelPreference];

        const element = (
          <span
            class={style('channelName', 'data-[disabled=true]:nt-text-foreground-alpha-200')}
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
    <div class={style('channelDescription', 'nt-text-sm nt-text-foreground-alpha-600 nt-text-start')}>
      {channelNames()}
    </div>
  );
};

const PreferencesRow = (props: {
  localizationKey: StringLocalizationKey;
  channels: ChannelPreference;
  workflowId?: string;
  onChange: ({ channel, enabled, workflowId }: { workflowId?: string; channel: ChannelType; enabled: boolean }) => void;
  isCritical?: boolean;
}) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const style = useStyle();
  const { t } = useLocalization();

  const channels = createMemo(() => Object.keys(props.channels || {}));

  return (
    <Show when={channels().length > 0}>
      <div
        class={style(
          'workflowContainer',
          `nt-p-4 nt-flex nt-flex-col nt-gap-1 nt-items-start nt-self-stretch 
          hover:nt-bg-neutral-100 nt-rounded-lg data-[disabled=true]:nt-bg-neutral-alpha-50`
        )}
        data-disabled={props.isCritical}
        data-open={isOpen()}
      >
        <div
          class={style(
            'workflowLabelContainer',
            'nt-flex nt-justify-between nt-flex-nowrap nt-self-stretch nt-cursor-pointer nt-items-center'
          )}
          onClick={() => setIsOpen((prev) => !prev)}
          data-disabled={props.isCritical}
          data-open={isOpen()}
        >
          <div>
            <div
              class={style(
                'workflowLabel',
                'nt-text-base nt-font-semibold nt-text-start nt-flex nt-items-center nt-gap-1'
              )}
              data-disabled={props.isCritical}
              data-localization={props.localizationKey}
              data-open={isOpen()}
            >
              <Show when={props.isCritical}>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    asChild={(childProps) => (
                      <span
                        class={style('workflowLabelDisabled__icon', 'nt-text-foreground-alpha-600')}
                        {...childProps}
                      >
                        <Lock />
                      </span>
                    )}
                  />
                  <Tooltip.Content data-localization="preferences.workflow.disabled.tooltip">
                    {t('preferences.workflow.disabled.tooltip')}
                  </Tooltip.Content>
                </Tooltip.Root>
              </Show>
              {t(props.localizationKey)}
            </div>
            <ChannelsLabel channels={props.channels} />
          </div>
          <span
            class={style(
              'workflowContainerRight__icon',
              `nt-text-foreground-alpha-600 nt-transition-all nt-duration-200 data-[open=true]:nt-transform data-[open=true]:nt-rotate-180`
            )}
            data-disabled={props.isCritical}
            data-open={isOpen()}
          >
            <ArrowDropDown class={style('workflowArrow__icon', 'nt-text-foreground-alpha-600')} />
          </span>
        </div>
        <Show when={isOpen()}>
          <div class={style('channelsContainer', 'nt-flex nt-flex-col nt-gap-1 nt-self-stretch')}>
            <Show when={props.isCritical}>
              <span
                class={style(
                  'workflowContainerDisabledNotice',
                  'nt-text-sm nt-text-foreground-alpha-600 nt-text-start'
                )}
                data-localization="preferences.workflow.disabled.notice"
              >
                {t('preferences.workflow.disabled.notice')}
              </span>
            </Show>
            <For each={channels()}>
              {(channel) => (
                <ChannelRow
                  channel={channel as ChannelType}
                  enabled={!!props.channels[channel as keyof ChannelPreference]}
                  workflowId={props.workflowId}
                  onChange={props.onChange}
                  isCritical={props.isCritical}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
};
