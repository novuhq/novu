import { badgeStyles, formatSnoozedUntil, formatToRelativeTime, notificationItemStyles } from '@novu/js/ui-core';
import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNovuUI } from '../../../context/NovuUIContext';
import { useLocalization, useStyle } from '../../../hooks/internal/useEngineStores';
import { ClockIcon } from '../ClockIcon';
import { useNotificationItem } from '../context';

export type NotificationItemDateProps = { className?: string; children?: ReactNode };

const MINUTE = 60 * 1000;

const useMinuteTick = () => {
  const [, setMinutesPassed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setMinutesPassed((prev) => prev + 1), MINUTE);

    return () => clearInterval(interval);
  }, []);
};

const Clock = ({ styleKey }: { styleKey: 'deliveredAtIcon' | 'snoozedUntilIcon' }) => {
  const { notification } = useNotificationItem('Date');
  const { icons } = useNovuUI();
  const style = useStyle();
  const className = style({
    key: notificationItemStyles[styleKey].key,
    className: notificationItemStyles[styleKey].className,
    iconKey: 'clock',
    context: { notification },
  });

  if (icons.clock) {
    return <>{icons.clock({ class: className })}</>;
  }

  return <ClockIcon className={className} />;
};

/** When the notification arrived, when it was delivered again, or until when it is snoozed. */
export const Date = ({ className, children }: NotificationItemDateProps) => {
  const { notification } = useNotificationItem('Date');
  const style = useStyle();
  const { t, locale } = useLocalization();
  useMinuteTick();

  const createdAt = formatToRelativeTime({ fromDate: new globalThis.Date(notification.createdAt), locale });
  const snoozedUntil = notification.snoozedUntil
    ? formatSnoozedUntil({ untilDate: new globalThis.Date(notification.snoozedUntil), locale })
    : null;
  const deliveredAt = useMemo(
    () =>
      Array.isArray(notification.deliveredAt)
        ? notification.deliveredAt.map((date) => formatToRelativeTime({ fromDate: new globalThis.Date(date), locale }))
        : null,
    [notification.deliveredAt, locale]
  );

  let content: ReactNode = createdAt;
  if (children !== undefined) {
    content = children;
  } else if (snoozedUntil) {
    content = (
      <>
        <Clock styleKey="snoozedUntilIcon" />
        {t('notification.snoozedUntil')} · {snoozedUntil}
      </>
    );
  } else if (deliveredAt && deliveredAt.length >= 2) {
    const [previous, latest] = deliveredAt.slice(-2);
    content = (
      <>
        {' '}
        {previous} ·
        <span
          data-variant="secondary"
          data-size="default"
          className={style({
            key: notificationItemStyles.deliveredAtBadge.key,
            className: [badgeStyles.base, badgeStyles.variants.secondary, badgeStyles.sizes.default].join(' '),
            context: { notification },
          })}
        >
          <Clock styleKey="deliveredAtIcon" />
          {latest}
        </span>
      </>
    );
  }

  return (
    <div
      className={style({
        key: notificationItemStyles.date.key,
        className: [notificationItemStyles.date.className, className].filter(Boolean).join(' '),
        context: { notification },
      })}
    >
      {content}
    </div>
  );
};
