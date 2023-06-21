const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const YEAR = DAY * 365;

const UNITS = {
  year: YEAR,
  month: YEAR / 12,
  day: DAY,
  hour: HOUR,
  minute: MINUTE,
  second: SECOND,
};

const DEFAULT_LOCALE = 'en';

export function formatRelativeTime({
  fromDate,
  toDate = new Date(),
  locale = DEFAULT_LOCALE,
}: {
  fromDate: Date;
  toDate?: Date;
  locale?: string;
}) {
  const elapsed = fromDate.getTime() - toDate.getTime();

  // "Math.abs" accounts for both "past" & "future" scenarios
  for (const unit in UNITS) {
    if (Math.abs(elapsed) > UNITS[unit] || unit === 'second') {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

      return rtf.format(Math.round(elapsed / UNITS[unit]), unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return fromDate.toLocaleDateString(locale);
}
