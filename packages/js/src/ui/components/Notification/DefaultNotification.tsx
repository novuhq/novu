import { createEffect, createMemo, createSignal, For, JSX, Show } from 'solid-js';

import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import { useInboxContext, useLocalization } from '../../context';
import { cn, formatToRelativeTime, useStyle } from '../../helpers';
import { MarkAsUnarchived } from '../../icons';
import { Clock } from '../../icons/Clock';
import { MarkAsArchived } from '../../icons/MarkAsArchived';
import { MarkAsRead } from '../../icons/MarkAsRead';
import { MarkAsUnread } from '../../icons/MarkAsUnread';
import { Snooze } from '../../icons/Snooze';
import { Unsnooze } from '../../icons/Unsnooze';
import {
  LocalizationKey,
  NotificationStatus,
  type BodyRenderer,
  type NotificationActionClickHandler,
  type NotificationClickHandler,
  type SubjectRenderer,
} from '../../types';
import Markdown from '../elements/Markdown';
import { ExternalElementRenderer } from '../ExternalElementRenderer';
import { Button, Dropdown, dropdownItemVariants, Popover } from '../primitives';
import { Badge } from '../primitives/Badge';
import { Tooltip } from '../primitives/Tooltip';
import { SnoozeDateTimePicker } from './SnoozeDateTimePicker';

const SNOOZE_PRESETS = [
  {
    key: 'snooze.options.anHourFromNow',
    hours: 1,
    getDate: () => new Date(Date.now() + 1 * 60 * 60 * 1000),
  },
  {
    key: 'snooze.options.inTwelveHours',
    hours: 12,
    getDate: () => new Date(Date.now() + 12 * 60 * 60 * 1000),
  },
  {
    key: 'snooze.options.inOneDay',
    hours: 24,
    getDate: () => new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  },
  {
    key: 'snooze.options.inOneWeek',
    hours: 168,
    getDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
] satisfies {
  key: LocalizationKey;
  hours: number;
  getDate: () => Date;
}[];

const formatSnoozeOption = (
  preset: (typeof SNOOZE_PRESETS)[number],
  t: (key: LocalizationKey) => string,
  locale: string
): string => {
  const date = preset.getDate();

  // For hour-based presets (1 hour, 12 hours), just show the translation without time
  if (preset.hours <= 12) {
    return t(preset.key);
  }

  // Format time (e.g., "9:00 AM")
  const timeString = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric' }).format(date);

  // For one day (tomorrow)
  if (preset.key === 'snooze.options.inOneDay') {
    return `${t(preset.key)}, ${timeString}`;
  }

  // For weekly option, show "Next Monday" etc.
  if (preset.key === 'snooze.options.inOneWeek') {
    // Get the day name (e.g., "Monday")
    const dayName = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
    return `Next ${dayName}, ${timeString}`;
  }

  // Fallback to original translation
  return `${t(preset.key)}, ${timeString}`;
};

type DefaultNotificationProps = {
  notification: Notification;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const DefaultNotification = (props: DefaultNotificationProps) => {
  const style = useStyle();
  const { t, locale } = useLocalization();
  const { navigate, status, maxSnoozeDurationHours } = useInboxContext();
  const [isSnoozeDateTimePickerOpen, setIsSnoozeDateTimePickerOpen] = createSignal(false);
  const [minutesPassed, setMinutesPassed] = createSignal(0);
  const createdAt = createMemo(() => {
    minutesPassed(); // register as dep

    return formatToRelativeTime({ fromDate: new Date(props.notification.createdAt), locale: locale() });
  });
  const snoozedUntil = createMemo(() => {
    minutesPassed(); // register as dep
    if (!props.notification.snoozedUntil) {
      return null;
    }

    return formatToRelativeTime({ fromDate: new Date(props.notification.snoozedUntil), locale: locale() });
  });
  const deliveredAt = createMemo(() => {
    minutesPassed(); // register as dep

    if (!props.notification.deliveredAt || !Array.isArray(props.notification.deliveredAt)) {
      return null;
    }

    return props.notification.deliveredAt.map((date) =>
      formatToRelativeTime({ fromDate: new Date(date), locale: locale() })
    );
  });

  const availableSnoozePresets = createMemo(() => {
    if (!maxSnoozeDurationHours()) return SNOOZE_PRESETS;

    return SNOOZE_PRESETS.filter((preset) => preset.hours <= maxSnoozeDurationHours());
  });

  createEffect(() => {
    const interval = setInterval(() => {
      setMinutesPassed((prev) => prev + 1);
    }, 1000 * 60);

    return () => clearInterval(interval);
  });

  const handleNotificationClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!props.notification.isRead) {
      await props.notification.read();
    }

    props.onNotificationClick?.(props.notification);

    navigate(props.notification.redirect?.url, props.notification.redirect?.target);
  };

  const handleActionButtonClick = async (action: ActionTypeEnum, e: MouseEvent) => {
    e.stopPropagation();

    if (action === ActionTypeEnum.PRIMARY) {
      await props.notification.completePrimary();
      props.onPrimaryActionClick?.(props.notification);

      navigate(props.notification.primaryAction?.redirect?.url, props.notification.primaryAction?.redirect?.target);
    } else {
      await props.notification.completeSecondary();
      props.onSecondaryActionClick?.(props.notification);

      navigate(props.notification.secondaryAction?.redirect?.url, props.notification.secondaryAction?.redirect?.target);
    }
  };

  return (
    <a
      class={style(
        'notification',
        cn(
          'nt-w-full nt-text-sm hover:nt-bg-primary-alpha-25 nt-group nt-relative nt-flex nt-items-start nt-p-4 nt-gap-2',
          '[&:not(:first-child)]:nt-border-t nt-border-neutral-alpha-100',
          {
            'nt-cursor-pointer': !props.notification.isRead || !!props.notification.redirect?.url,
          }
        )
      )}
      onClick={handleNotificationClick}
    >
      <Show
        when={props.notification.avatar}
        fallback={
          <div
            class={style('notificationImageLoadingFallback', 'nt-size-8 nt-rounded-lg nt-shrink-0 nt-aspect-square')}
          />
        }
      >
        <img
          class={style('notificationImage', 'nt-size-8 nt-rounded-lg nt-object-cover nt-aspect-square')}
          src={props.notification.avatar}
        />
      </Show>
      <div class={style('notificationContent', 'nt-flex nt-flex-col nt-gap-2 nt-w-full')}>
        <div class={style('notificationTextContainer')}>
          <Show
            when={props.renderSubject}
            fallback={
              <Show when={props.notification.subject}>
                {(subject) => (
                  <Markdown
                    appearanceKey="notificationSubject"
                    class="nt-text-start nt-font-medium"
                    strongAppearanceKey="notificationSubject__strong"
                  >
                    {subject()}
                  </Markdown>
                )}
              </Show>
            }
          >
            {(renderSubject) => <ExternalElementRenderer render={(el) => renderSubject()(el, props.notification)} />}
          </Show>
          <Show
            when={props.renderBody}
            fallback={
              <Markdown
                appearanceKey="notificationBody"
                strongAppearanceKey="notificationBody__strong"
                class="nt-text-start nt-whitespace-pre-wrap nt-text-foreground-alpha-600"
              >
                {props.notification.body}
              </Markdown>
            }
          >
            {(renderBody) => <ExternalElementRenderer render={(el) => renderBody()(el, props.notification)} />}
          </Show>
        </div>
        <div
          class={style(
            'notificationDefaultActions',
            'nt-absolute nt-transition nt-duration-100 nt-ease-out nt-gap-0.5 nt-flex nt-shrink-0 nt-opacity-0 group-hover:nt-opacity-100 group-focus-within:nt-opacity-100 nt-justify-center nt-items-center nt-bg-background/90 nt-right-3 nt-top-3 nt-border nt-border-neutral-alpha-100 nt-rounded-lg nt-backdrop-blur-lg nt-p-0.5'
          )}
        >
          <Show when={status() !== NotificationStatus.ARCHIVED}>
            <Show
              when={props.notification.isRead}
              fallback={
                <Tooltip.Root>
                  <Tooltip.Trigger
                    asChild={(childProps) => (
                      <Button
                        appearanceKey="notificationRead__button"
                        size="iconSm"
                        variant="ghost"
                        {...childProps}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await props.notification.read();
                        }}
                      >
                        <MarkAsRead class={style('notificationRead__icon', 'nt-size-3')} />
                      </Button>
                    )}
                  />
                  <Tooltip.Content data-localization="notification.actions.read.tooltip">
                    {t('notification.actions.read.tooltip')}
                  </Tooltip.Content>
                </Tooltip.Root>
              }
            >
              <Tooltip.Root>
                <Tooltip.Trigger
                  asChild={(childProps) => (
                    <Button
                      appearanceKey="notificationUnread__button"
                      size="iconSm"
                      variant="ghost"
                      {...childProps}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await props.notification.unread();
                      }}
                    >
                      <MarkAsUnread class={style('notificationUnread__icon', 'nt-size-3')} />
                    </Button>
                  )}
                />
                <Tooltip.Content data-localization="notification.actions.unread.tooltip">
                  {t('notification.actions.unread.tooltip')}
                </Tooltip.Content>
              </Tooltip.Root>
            </Show>
          </Show>

          <Show
            when={props.notification.isSnoozed}
            fallback={
              <Tooltip.Root>
                <Tooltip.Trigger
                  asChild={(tooltipProps) => (
                    <Dropdown.Root>
                      <Dropdown.Trigger
                        {...tooltipProps}
                        asChild={(popoverProps) => (
                          <Button
                            appearanceKey="notificationSnooze__button"
                            size="iconSm"
                            variant="ghost"
                            {...popoverProps}
                          >
                            <Snooze class={style('notificationSnooze__icon', 'nt-size-3')} />
                          </Button>
                        )}
                      />
                      <Dropdown.Content portal appearanceKey="notificationSnooze__dropdownContent">
                        <For each={availableSnoozePresets()}>
                          {(preset) => (
                            <Dropdown.Item
                              appearanceKey="notificationSnooze__dropdownItem"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await props.notification.snooze(preset.getDate().toISOString());
                              }}
                            >
                              <Clock
                                class={style(
                                  'notificationSnooze__dropdownItem__icon',
                                  'nt-size-3 nt-text-foreground-alpha-400'
                                )}
                              />
                              {formatSnoozeOption(preset, t, locale())}
                            </Dropdown.Item>
                          )}
                        </For>

                        <Popover.Root open={isSnoozeDateTimePickerOpen()} onOpenChange={setIsSnoozeDateTimePickerOpen}>
                          <Dropdown.Item
                            asChild={(props) => (
                              <Popover.Trigger
                                class={style('notificationSnooze__dropdownItem', dropdownItemVariants())}
                                {...props}
                              >
                                <Clock
                                  class={style(
                                    'notificationSnooze__dropdownItem__icon',
                                    'nt-size-3 nt-text-foreground-alpha-400'
                                  )}
                                />
                                {t('snooze.options.customTime')}
                              </Popover.Trigger>
                            )}
                          />
                          <Popover.Content
                            portal
                            class={style('notificationSnoozeCustomTime_popoverContent', 'nt-size-fit')}
                          >
                            <SnoozeDateTimePicker
                              maxDurationHours={maxSnoozeDurationHours()}
                              onSelect={async (date) => {
                                await props.notification.snooze(date.toISOString());
                              }}
                              onCancel={() => {
                                setIsSnoozeDateTimePickerOpen(false);
                              }}
                            />
                          </Popover.Content>
                        </Popover.Root>
                      </Dropdown.Content>
                    </Dropdown.Root>
                  )}
                />
                <Tooltip.Content data-localization="notification.actions.read.tooltip">
                  {t('notification.actions.snooze.tooltip')}
                </Tooltip.Content>
              </Tooltip.Root>
            }
          >
            <Tooltip.Root>
              <Tooltip.Trigger
                asChild={(childProps) => (
                  <Button
                    appearanceKey="notificationUnsnooze__button"
                    size="iconSm"
                    variant="ghost"
                    {...childProps}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await props.notification.unsnooze();
                    }}
                  >
                    <Unsnooze class={style('notificationUnsnooze__icon', 'nt-size-3')} />
                  </Button>
                )}
              />
              <Tooltip.Content data-localization="notification.actions.unsnooze.tooltip">
                {t('notification.actions.unsnooze.tooltip')}
              </Tooltip.Content>
            </Tooltip.Root>
          </Show>

          <Show
            when={props.notification.isArchived}
            fallback={
              <Tooltip.Root>
                <Tooltip.Trigger
                  asChild={(childProps) => (
                    <Button
                      appearanceKey="notificationArchive__button"
                      size="iconSm"
                      variant="ghost"
                      {...childProps}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await props.notification.archive();
                      }}
                    >
                      <MarkAsArchived class={style('notificationArchive__icon', 'nt-size-3')} />
                    </Button>
                  )}
                />
                <Tooltip.Content data-localization="notification.actions.archive.tooltip">
                  {t('notification.actions.archive.tooltip')}
                </Tooltip.Content>
              </Tooltip.Root>
            }
          >
            <Tooltip.Root>
              <Tooltip.Trigger
                asChild={(childProps) => (
                  <Button
                    appearanceKey="notificationUnarchive__button"
                    size="iconSm"
                    variant="ghost"
                    {...childProps}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await props.notification.unarchive();
                    }}
                  >
                    <MarkAsUnarchived class={style('notificationArchive__icon', 'nt-size-3')} />
                  </Button>
                )}
              />
              <Tooltip.Content data-localization="notification.actions.unarchive.tooltip">
                {t('notification.actions.unarchive.tooltip')}
              </Tooltip.Content>
            </Tooltip.Root>
          </Show>
        </div>
        <Show when={props.notification.primaryAction || props.notification.secondaryAction}>
          <div class={style('notificationCustomActions', 'nt-flex nt-flex-wrap nt-gap-2')}>
            <Show when={props.notification.primaryAction} keyed>
              {(primaryAction) => (
                <Button
                  appearanceKey="notificationPrimaryAction__button"
                  variant="default"
                  onClick={(e) => handleActionButtonClick(ActionTypeEnum.PRIMARY, e)}
                >
                  {primaryAction.label}
                </Button>
              )}
            </Show>
            <Show when={props.notification.secondaryAction} keyed>
              {(secondaryAction) => (
                <Button
                  appearanceKey="notificationSecondaryAction__button"
                  variant="secondary"
                  onClick={(e) => handleActionButtonClick(ActionTypeEnum.SECONDARY, e)}
                >
                  {secondaryAction.label}
                </Button>
              )}
            </Show>
          </div>
        </Show>
        <div class={style('notificationDate', 'nt-text-foreground-alpha-400 nt-flex nt-items-center nt-gap-1')}>
          <Show
            when={snoozedUntil()}
            fallback={
              <>
                <Show when={deliveredAt()} fallback={<>{createdAt()}</>}>
                  {(deliveredAt) => (
                    <Show when={deliveredAt().length > 2}>
                      {' '}
                      <For each={deliveredAt().slice(-2)}>
                        {(date, index) => (
                          <>
                            <Show when={index() === 0}>{date} ·</Show>
                            <Show when={index() === 1}>
                              <Badge appearanceKey="notificationDeliveredAt__badge">
                                <Clock class={style('notificationDeliveredAt__icon', 'nt-size-3')} />
                                {date}
                              </Badge>
                            </Show>
                          </>
                        )}
                      </For>
                    </Show>
                  )}
                </Show>
              </>
            }
          >
            {(snoozedUntil) => (
              <>
                <Clock class={style('notificationRemindingLater__icon', 'nt-size-3')} />
                {t('notification.remindingLater')} · {snoozedUntil()}
              </>
            )}
          </Show>
        </div>
      </div>

      <Show when={!props.notification.isRead}>
        <span class={style('notificationDot', 'nt-size-1.5 nt-bg-primary nt-rounded-full nt-shrink-0')} />
      </Show>
    </a>
  );
};
