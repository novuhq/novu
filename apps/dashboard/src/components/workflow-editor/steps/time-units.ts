import { TimeUnitEnum } from '@novu/shared';

export const TIME_UNIT_OPTIONS: Array<{ label: string; value: TimeUnitEnum }> = [
  {
    label: 'second(s)',
    value: TimeUnitEnum.SECONDS,
  },
  {
    label: 'minute(s)',
    value: TimeUnitEnum.MINUTES,
  },
  {
    label: 'hour(s)',
    value: TimeUnitEnum.HOURS,
  },
  {
    label: 'day(s)',
    value: TimeUnitEnum.DAYS,
  },
  {
    label: 'week(s)',
    value: TimeUnitEnum.WEEKS,
  },
  {
    label: 'month(s)',
    value: TimeUnitEnum.MONTHS,
  },
];
