import { createMemo, createSignal, For, JSX } from 'solid-js';
import type { Notification } from '../../../notifications';
import { useInboxContext, useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { MarkAsUnarchived as DefaultMarkAsUnarchived } from '../../icons';
import { Clock, Clock as DefaultClock } from '../../icons/Clock';
import { MarkAsArchived as DefaultMarkAsArchived } from '../../icons/MarkAsArchived';
import { MarkAsRead as DefaultMarkAsRead } from '../../icons/MarkAsRead';
import { MarkAsUnread as DefaultMarkAsUnread } from '../../icons/MarkAsUnread';
import { Unsnooze as DefaultUnsnooze } from '../../icons/Unsnooze';
import { LocalizationKey, NotificationStatus } from '../../types';
import { Button, Dropdown, dropdownItemVariants, Popover } from '../primitives';
import { Tooltip } from '../primitives/Tooltip';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';
import { SnoozeDateTimePicker } from './SnoozeDateTimePicker';

export const SNOOZE_PRESETS = [
  {
    key: 'snooze.options.anHourFromNow',
    hours: 1,
    getDate: () => new Date(Date.now() + 1 * 60 * 60 * 1000),
  },
  {
    key: 'snooze.options.inOneDay',
    hours: 24,
    getDate: () => {
      const date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
      date.setHours(9, 0, 0, 0);

      return date;
    },
  },
  {
    key: 'snooze.options.inOneWeek',
    hours: 168,
    getDate: () => {
      const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      date.setHours(9, 0, 0, 0);

      return date;
    },
  },
] satisfies {
  key: Extract<LocalizationKey, `snooze.options.${string}`>;
  hours: number;
  getDate: () => Date;
}[];

export const formatSnoozeOption = (
  preset: (typeof SNOOZE_PRESETS)[number],
  t: (key: LocalizationKey) => string,
  locale: string
): { label: string; time: string } => {
  const date = preset.getDate();

  // Format weekday (e.g., "Wed")
  const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);

  // Format date and month (e.g., "26 Mar")
  const dateMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);

  // Format time (e.g., "9:00 PM")
  const timeString = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric' }).format(date);

  // Combine to e.g. "Wed, 26 Mar, 9:00 PM"
  return { label: t(preset.key), time: `${dayName}, ${dateMonth}, ${timeString}` };
};

const SnoozeDropdownItem = (props: {
  label: string;
  time: string;
  onClick?: (e: MouseEvent) => void;
  asChild?: (props: any) => JSX.Element;
}) => {
  const style = useStyle();
  const snoozeItemIconClass = style({
    key: 'notificationSnooze__dropdownItem__icon',
    className: 'nt-size-3 nt-text-foreground-alpha-400 nt-mr-2',
    iconKey: 'clock',
  });

  const content = (
    <>
      <div
        class={style({
          key: 'dropdownItem',
          className: 'nt-flex nt-items-center nt-flex-1',
        })}
      >
        <IconRendererWrapper
          iconKey="clock"
          class={snoozeItemIconClass}
          fallback={<DefaultClock class={snoozeItemIconClass} />}
        />
        <span
          class={style({
            key: 'dropdownItemLabel',
          })}
        >
          {props.label}
        </span>
      </div>
      <span
        class={style({
          key: 'dropdownItemRight__icon',
          className: 'nt-text-foreground-alpha-300 nt-ml-2 nt-text-xs',
        })}
      >
        {props.time}
      </span>
    </>
  );

  if (props.asChild) {
    return props.asChild({
      class: style({
        key: 'notificationSnooze__dropdownItem',
        className: dropdownItemVariants(),
      }),
      onClick: props.onClick,
      children: content,
    });
  }

  return (
    <Dropdown.Item
      appearanceKey="notificationSnooze__dropdownItem"
      onClick={props.onClick}
      class={style({
        key: 'dropdownItem',
        className: 'nt-justify-between',
      })}
    >
      {content}
    </Dropdown.Item>
  );
};

export const ReadButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t } = useLocalization();
  const readIconClass = style({
    key: 'notificationRead__icon',
    className: 'nt-size-3',
    iconKey: 'markAsRead',
  });

  return (
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
            <IconRendererWrapper
              iconKey="markAsRead"
              class={readIconClass}
              fallback={<DefaultMarkAsRead class={readIconClass} />}
            />
          </Button>
        )}
      />
      <Tooltip.Content data-localization="notification.actions.read.tooltip">
        {t('notification.actions.read.tooltip')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

export const UnreadButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t } = useLocalization();
  const unreadIconClass = style({
    key: 'notificationUnread__icon',
    className: 'nt-size-3',
    iconKey: 'markAsUnread',
  });

  return (
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
            <IconRendererWrapper
              iconKey="markAsUnread"
              class={unreadIconClass}
              fallback={<DefaultMarkAsUnread class={unreadIconClass} />}
            />
          </Button>
        )}
      />
      <Tooltip.Content data-localization="notification.actions.unread.tooltip">
        {t('notification.actions.unread.tooltip')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

export const ArchiveButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t } = useLocalization();
  const archiveIconClass = style({
    key: 'notificationArchive__icon',
    className: 'nt-size-3',
    iconKey: 'markAsArchived',
  });

  return (
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
            <IconRendererWrapper
              iconKey="markAsArchived"
              class={archiveIconClass}
              fallback={<DefaultMarkAsArchived class={archiveIconClass} />}
            />
          </Button>
        )}
      />
      <Tooltip.Content data-localization="notification.actions.archive.tooltip">
        {t('notification.actions.archive.tooltip')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

export const UnarchiveButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t } = useLocalization();
  const unarchiveIconClass = style({
    key: 'notificationArchive__icon',
    className: 'nt-size-3',
    iconKey: 'markAsUnarchived',
  });

  return (
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
            <IconRendererWrapper
              iconKey="markAsUnarchived"
              class={unarchiveIconClass}
              fallback={<DefaultMarkAsUnarchived class={unarchiveIconClass} />}
            />
          </Button>
        )}
      />
      <Tooltip.Content data-localization="notification.actions.unarchive.tooltip">
        {t('notification.actions.unarchive.tooltip')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

export const UnsnoozeButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t } = useLocalization();
  const unsnoozeIconClass = style({
    key: 'notificationUnsnooze__icon',
    className: 'nt-size-3',
    iconKey: 'unsnooze',
  });

  return (
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
            <IconRendererWrapper
              iconKey="unsnooze"
              class={unsnoozeIconClass}
              fallback={<DefaultUnsnooze class={unsnoozeIconClass} />}
            />
          </Button>
        )}
      />
      <Tooltip.Content data-localization="notification.actions.unsnooze.tooltip">
        {t('notification.actions.unsnooze.tooltip')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

export const SnoozeButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t, locale } = useLocalization();
  const { maxSnoozeDurationHours } = useInboxContext();
  const [isSnoozeDateTimePickerOpen, setIsSnoozeDateTimePickerOpen] = createSignal(false);
  const snoozeButtonIconClass = style({
    key: 'notificationSnooze__icon',
    className: 'nt-size-3',
    iconKey: 'clock',
  });

  const availableSnoozePresets = createMemo(() => {
    if (!maxSnoozeDurationHours()) return SNOOZE_PRESETS;

    return SNOOZE_PRESETS.filter((preset) => preset.hours <= maxSnoozeDurationHours());
  });

  return (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    popoverProps.onClick?.(e);
                  }}
                >
                  <IconRendererWrapper
                    iconKey="clock"
                    class={snoozeButtonIconClass}
                    fallback={<Clock class={snoozeButtonIconClass} />}
                  />
                </Button>
              )}
            />
            <Dropdown.Content portal appearanceKey="notificationSnooze__dropdownContent">
              <For each={availableSnoozePresets()}>
                {(preset) => {
                  const option = formatSnoozeOption(preset, t, locale());

                  return (
                    <SnoozeDropdownItem
                      label={option.label}
                      time={option.time}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await props.notification.snooze(preset.getDate().toISOString());
                      }}
                    />
                  );
                }}
              </For>

              <Popover.Root
                open={isSnoozeDateTimePickerOpen()}
                onOpenChange={setIsSnoozeDateTimePickerOpen}
                placement="bottom-start"
              >
                <SnoozeDropdownItem
                  label={t('snooze.options.customTime')}
                  time=""
                  asChild={(childProps) => (
                    <Popover.Trigger
                      {...childProps}
                      onClick={(e) => {
                        e.stopPropagation();
                        childProps.onClick?.(e);
                      }}
                    />
                  )}
                />
                <Popover.Content
                  portal
                  class={style({
                    key: 'notificationSnoozeCustomTime_popoverContent',
                    className: 'nt-size-fit nt-w-[260px]',
                  })}
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
      <Tooltip.Content data-localization="notification.actions.snooze.tooltip">
        {t('notification.actions.snooze.tooltip')}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

// Helper function to render the appropriate actions based on notification state
export const renderNotificationActions = (notification: Notification, status: () => NotificationStatus) => {
  const { isSnoozeEnabled } = useInboxContext();

  // Handle snoozed state - only show unsnooze
  if (notification.isSnoozed) {
    return <UnsnoozeButton notification={notification} />;
  }

  // Handle archived state - only show unarchive
  if (notification.isArchived) {
    return <UnarchiveButton notification={notification} />;
  }

  // Handle normal state - show read/unread, snooze, archive
  return (
    <>
      {status() !== NotificationStatus.ARCHIVED &&
        (notification.isRead ? (
          <UnreadButton notification={notification} />
        ) : (
          <ReadButton notification={notification} />
        ))}
      {isSnoozeEnabled() && <SnoozeButton notification={notification} />}
      <ArchiveButton notification={notification} />
    </>
  );
};
