import { createMemo, createSignal, For, JSX } from 'solid-js';
import type { Notification } from '../../../notifications';
import { useInboxContext, useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { Clock } from '../../icons/Clock';
import { MarkAsArchived } from '../../icons/MarkAsArchived';
import { MarkAsRead } from '../../icons/MarkAsRead';
import { MarkAsUnarchived } from '../../icons';
import { MarkAsUnread } from '../../icons/MarkAsUnread';
import { Snooze } from '../../icons/Snooze';
import { Unsnooze } from '../../icons/Unsnooze';
import { LocalizationKey, NotificationStatus } from '../../types';
import { Button, Dropdown, dropdownItemVariants, Popover } from '../primitives';
import { Tooltip } from '../primitives/Tooltip';
import { SnoozeDateTimePicker } from './SnoozeDateTimePicker';

export const SNOOZE_PRESETS = [
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
  key: Extract<LocalizationKey, `snooze.options.${string}`>;
  hours: number;
  getDate: () => Date;
}[];

export const formatSnoozeOption = (
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

  // For weekly option, show "Next Monday" etc.
  if (preset.key === 'snooze.options.inOneWeek') {
    // Get the day name (e.g., "Monday")
    const dayName = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);

    return `${t(preset.key)} ${dayName}, ${timeString}`;
  }

  // Fallback to original translation
  return `${t(preset.key)}, ${timeString}`;
};

export const ReadButton = (props: { notification: Notification }) => {
  const style = useStyle();
  const { t } = useLocalization();

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
            <MarkAsRead class={style('notificationRead__icon', 'nt-size-3')} />
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
            <MarkAsUnread class={style('notificationUnread__icon', 'nt-size-3')} />
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
            <MarkAsArchived class={style('notificationArchive__icon', 'nt-size-3')} />
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
            <MarkAsUnarchived class={style('notificationArchive__icon', 'nt-size-3')} />
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
            <Unsnooze class={style('notificationUnsnooze__icon', 'nt-size-3')} />
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
                      class={style('notificationSnooze__dropdownItem__icon', 'nt-size-3 nt-text-foreground-alpha-400')}
                    />
                    {formatSnoozeOption(preset, t, locale())}
                  </Dropdown.Item>
                )}
              </For>

              <Popover.Root
                open={isSnoozeDateTimePickerOpen()}
                onOpenChange={setIsSnoozeDateTimePickerOpen}
                placement="bottom-start"
              >
                <Dropdown.Item
                  asChild={(props) => (
                    <Popover.Trigger
                      class={style('notificationSnooze__dropdownItem', dropdownItemVariants())}
                      {...props}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onClick?.(e);
                      }}
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
                  class={style('notificationSnoozeCustomTime_popoverContent', 'nt-size-fit nt-w-[260px]')}
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
