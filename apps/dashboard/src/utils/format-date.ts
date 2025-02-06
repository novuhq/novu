import { format, formatDistance, isAfter, subDays } from 'date-fns';

export function formatDate(date: string) {
  return format(new Date(date), 'MMM d yyyy, HH:mm:ss');
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
