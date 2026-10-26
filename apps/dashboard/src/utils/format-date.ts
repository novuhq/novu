import { formatDistance, isAfter, subDays } from 'date-fns';

const shortDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** `Oct 31, 2026` */
export function formatShortDate(date: string | number | Date): string {
  return shortDateFormatter.format(new Date(date));
}

export function formatDateSimple(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
) {
  const dateObj = new Date(date);
  const oneDayAgo = subDays(new Date(), 1);

  if (isAfter(dateObj, oneDayAgo)) {
    const timeAgo = formatDistance(dateObj, new Date(), {
      addSuffix: true,
      includeSeconds: true,
    });

    return timeAgo.replace('about ', '');
  }

  return dateObj.toLocaleDateString('en-US', options);
}
