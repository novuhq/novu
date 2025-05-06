const DEFAULT_LOCALE = 'en-US';

const SECONDS = {
  inMinute: 60,
  inHour: 3600,
  inDay: 86_400,
  inWeek: 604_800,
  inMonth: 2_592_000,
};

export function formatToRelativeTime({
  fromDate,
  locale = DEFAULT_LOCALE,
  toDate = new Date(),
}: {
  fromDate: Date;
  locale?: string;
  toDate?: Date;
}) {
  // time elapsed in milliseconds between the two dates
  const elapsed = toDate.getTime() - fromDate.getTime();

  const formatter = new Intl.RelativeTimeFormat(locale, { style: 'narrow' });

  const diffInSeconds = Math.floor(elapsed / 1000);

  // If the difference is less than a minute, return 'Just now'
  if (Math.abs(diffInSeconds) < SECONDS.inMinute) {
    return 'Just now';
  }
  // If the difference is less than an hour, return the difference in minutes. i.e 3 minutes ago
  else if (Math.abs(diffInSeconds) < SECONDS.inHour) {
    return formatter.format(Math.floor(-diffInSeconds / SECONDS.inMinute), 'minute');
  }
  // If the difference is less than a day, return the difference in hours. i.e 3 hours ago
  else if (Math.abs(diffInSeconds) < SECONDS.inDay) {
    return formatter.format(Math.floor(-diffInSeconds / SECONDS.inHour), 'hour');
  }
  // If the difference is less than a month, return the difference in days. i.e 3 days ago
  else if (Math.abs(diffInSeconds) < SECONDS.inMonth) {
    return formatter.format(Math.floor(-diffInSeconds / SECONDS.inDay), 'day');
  }
  // Otherwise, return the date formatted with month and day. i.e Dec 3
  else {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(fromDate);
  }
}

/**
 * Formats a future date to indicate when a snoozed notification will appear.
 * Returns formats that pair well with "Snoozed until" label, like "2 hours" or "Mar 5"
 */
export function formatSnoozedUntil({ untilDate, locale = DEFAULT_LOCALE }: { untilDate: Date; locale?: string }) {
  // time remaining in milliseconds between the two dates
  const remaining = untilDate.getTime() - new Date().getTime();

  const diffInSeconds = Math.floor(remaining / 1000);

  /*
   * Handle past dates - this covers edge cases when socket failures or delays
   * cause notifications to appear in snoozed state after their snooze time
   * should be rare, but it can potentially happen
   */
  if (diffInSeconds < 0) {
    return 'soon';
  }

  // If returning in less than a minute
  if (diffInSeconds < SECONDS.inMinute) {
    return 'a moment';
  }
  // If returning in less than an hour, return minutes
  else if (diffInSeconds < SECONDS.inHour) {
    const minutes = Math.floor(diffInSeconds / SECONDS.inMinute);

    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  // If returning in less than a day, return hours
  else if (diffInSeconds < SECONDS.inDay) {
    const hours = Math.floor(diffInSeconds / SECONDS.inHour);

    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  // If returning in less than a week, return days
  else if (diffInSeconds < SECONDS.inWeek) {
    const days = Math.floor(diffInSeconds / SECONDS.inDay);

    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  // Otherwise, return the date formatted with month and day
  else {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(untilDate);
  }
}
