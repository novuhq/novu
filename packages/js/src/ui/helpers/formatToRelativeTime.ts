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
  if (diffInSeconds < SECONDS.inMinute) {
    return 'Just now';
  }
  // If the difference is less than an hour, return the difference in minutes. i.e 3 minutes ago
  else if (diffInSeconds < SECONDS.inHour) {
    return formatter.format(Math.floor(-diffInSeconds / SECONDS.inMinute), 'minute');
  }
  // If the difference is less than a day, return the difference in hours. i.e 3 hours ago
  else if (diffInSeconds < SECONDS.inDay) {
    return formatter.format(Math.floor(-diffInSeconds / SECONDS.inHour), 'hour');
  }
  // If the difference is less than a month, return the difference in days. i.e 3 days ago
  else if (diffInSeconds < SECONDS.inMonth) {
    return formatter.format(Math.floor(-diffInSeconds / SECONDS.inDay), 'day');
  }
  // Otherwise, return the date formatted with month and day. i.e Dec 3
  else {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(fromDate);
  }
}
