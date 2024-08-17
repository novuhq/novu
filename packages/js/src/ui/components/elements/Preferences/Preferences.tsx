import clsx from 'clsx';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { useLocalization } from 'src/ui/context';
import { ChannelPreference, ChannelType, PreferenceLevel } from '../../../../types';
import { usePreferences } from '../../../api';
import { useStyle } from '../../../helpers';
import { ArrowDropDown, Lock } from '../../../icons';
import { Tooltip } from '../../primitives/Tooltip';
import { ChannelRow, getLabel } from './ChannelRow';
import { LoadingScreen } from './LoadingScreen';

/* This is also going to be exported as a separate component. Keep it pure. */
export const Preferences = () => {
  const style = useStyle();
  const { t } = useLocalization();

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
    <div
      class={style(
        'preferencesContainer',
        'nt-p-2 nt-flex nt-flex-col nt-gap-1 nt-bg-background nt-overflow-y-auto nt-h-full'
      )}
    >
      <Show when={preferences.loading}>
        <LoadingScreen />
      </Show>
      <Show when={!preferences.loading && preferences()}>
        <PreferencesRow
          label={t('preferences.global')}
          channels={allPreferences().globalPreference?.channels || {}}
          onChange={optimisticUpdate}
        />

        <For each={allPreferences().workflowPreferences}>
          {(preference) => (
            <PreferencesRow
              label={preference.workflow?.name as string}
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

const PreferencesRow = (props: {
  label: string;
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
          clsx(
            'nt-p-4 nt-flex nt-flex-col nt-gap-1 nt-items-start nt-self-stretch hover:nt-bg-neutral-100 nt-rounded-lg',
            {
              'nt-bg-neutral-alpha-50': props.isCritical,
            }
          )
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
              data-open={isOpen()}
            >
              <Show when={props.isCritical}>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    asChild={(childProps) => (
                      <span class={style('worfklowLabelDisabledIcon', 'nt-text-foreground-alpha-600')} {...childProps}>
                        <Lock />
                      </span>
                    )}
                  />
                  <Tooltip.Content>{t('preferences.workflow.disabled.tooltip')}</Tooltip.Content>
                </Tooltip.Root>
              </Show>
              {props.label}
            </div>
            <ChannelsLabel channels={props.channels} />
          </div>
          <span
            class={style(
              'workflowContainerRightIcon',
              clsx('nt-text-foreground-alpha-600 nt-transition-all nt-duration-200', {
                'nt-transform nt-rotate-180': isOpen(),
              })
            )}
            data-disabled={props.isCritical}
            data-open={isOpen()}
          >
            <ArrowDropDown />
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
