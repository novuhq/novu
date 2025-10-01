import cronParser, {
  CronFields,
  DayOfTheMonthRange,
  DayOfTheWeekRange,
  HourRange,
  MonthRange,
  SixtyRange,
} from 'cron-parser';
import isEqual from 'lodash.isequal';

import { dedup, range, sort } from '@/utils/arrays';

export enum PeriodValues {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export interface Unit {
  type: PeriodValues;
  min: number;
  max: number;
  total: number;
  alt?: string[];
}

export type UiCronFields = {
  second: number[];
  minute: number[];
  hour: number[];
  dayOfWeek: number[];
  dayOfMonth: number[];
  month: number[];
};

export const EVERY_SECOND = range(0, 59);
export const EVERY_MINUTE = range(0, 59);
export const EVERY_HOUR = range(0, 23);
export const EVERY_DAY_OF_MONTH = range(1, 31);
export const EVERY_MONTH = range(1, 12);
export const EVERY_DAY_OF_WEEK = range(0, 7);

export const EVERY_MINUTE_CRON = '* * * * *';

const MINUTE_UNIT: Unit = {
  type: PeriodValues.MINUTE,
  min: 0,
  max: 59,
  total: 60,
};

const HOUR_UNIT: Unit = {
  type: PeriodValues.HOUR,
  min: 0,
  max: 23,
  total: 24,
};

const DAY_UNIT: Unit = {
  type: PeriodValues.DAY,
  min: 1,
  max: 31,
  total: 31,
};

const MONTH_UNIT: Unit = {
  type: PeriodValues.MONTH,
  min: 1,
  max: 12,
  total: 12,
};

const WEEK_UNIT: Unit = {
  type: PeriodValues.WEEK,
  min: 0,
  max: 6,
  total: 7,
};

export const UNITS: Unit[] = [MINUTE_UNIT, HOUR_UNIT, DAY_UNIT, MONTH_UNIT, WEEK_UNIT];

function isEveryMinute(minute: number[]) {
  return minute.length === 0 || minute.length === MINUTE_UNIT.total;
}

function isEveryHour(hour: number[]) {
  return hour.length === 0 || hour.length === HOUR_UNIT.total;
}

function isEveryDayOfWeek(dayOfWeek: number[]) {
  return dayOfWeek.length === 0 || dayOfWeek.length >= WEEK_UNIT.total;
}

function isEveryDayOfMonth(dayOfMonth: number[]) {
  return dayOfMonth.length === 0 || dayOfMonth.length === DAY_UNIT.total;
}

function isEveryMonth(month: number[]) {
  return month.length === 0 || month.length === MONTH_UNIT.total;
}

/**
 * Convert a string to number but fail if not valid for cron
 */
function convertStringToNumber(str: string) {
  const parseIntValue = parseInt(str, 10);
  const numberValue = Number(str);

  return parseIntValue === numberValue ? numberValue : NaN;
}

/**
 * Replaces the alternative representations of numbers in a string
 */
function replaceAlternatives(str: string, min: number, alt?: string[]) {
  if (alt) {
    str = str.toUpperCase();

    for (let i = 0; i < alt.length; i++) {
      str = str.replace(alt[i], `${i + min}`);
    }
  }

  return str;
}

/**
 * Replace all 7 with 0 as Sunday can be represented by both
 */
function fixSunday(values: number[], unit: Unit) {
  if (unit.type === PeriodValues.WEEK) {
    values = values.map((value) => {
      if (value === 7) {
        return 0;
      }

      return value;
    });
  }

  return values;
}

/**
 * Parses a range string
 */
function parseRange(rangeStr: string, context: string, unit: Unit) {
  const subparts = rangeStr.split('-');

  if (subparts.length === 1) {
    const value = convertStringToNumber(subparts[0]);

    if (isNaN(value)) {
      throw new Error(`Invalid value "${context}" for ${unit.type}`);
    }

    return [value];
  } else if (subparts.length === 2) {
    const minValue = convertStringToNumber(subparts[0]);
    const maxValue = convertStringToNumber(subparts[1]);

    if (isNaN(minValue) || isNaN(maxValue)) {
      throw new Error(`Invalid value "${context}" for ${unit.type}`);
    }

    // Fix to allow equal min and max range values
    // cf: https://github.com/roccivic/cron-converter/pull/15
    if (maxValue < minValue) {
      throw new Error(`Max range is less than min range in "${rangeStr}" for ${unit.type}`);
    }

    return range(minValue, maxValue);
  } else {
    throw new Error(`Invalid value "${rangeStr}" for ${unit.type}`);
  }
}

/**
 * Finds an element from values that is outside of the range of unit
 */
function outOfRange(values: number[], unit: Unit) {
  const first = values[0];
  const last = values[values.length - 1];

  if (first < unit.min) {
    return first;
  } else if (last > unit.max) {
    return last;
  }

  return;
}

/**
 * Parses the step from a part string
 */
function parseStep(step: string, unit: Unit) {
  if (typeof step !== 'undefined') {
    const parsedStep = convertStringToNumber(step);

    if (isNaN(parsedStep) || parsedStep < 1) {
      throw new Error(`Invalid interval step value "${step}" for ${unit.type}`);
    }

    return parsedStep;
  }
}

/**
 * Applies an interval step to a collection of values
 */
function applyInterval(values: number[], step?: number) {
  if (step) {
    const minVal = values[0];

    values = values.filter((value) => {
      return value % step === minVal % step || value === minVal;
    });
  }

  return values;
}

/**
 * Parses a string as a range of positive integers
 */
function parsePartString(str: string, unit: Unit) {
  if (str === '*' || str === '*/1') {
    return [];
  }

  const values = sort(
    dedup(
      fixSunday(
        replaceAlternatives(str, unit.min, unit.alt)
          .split(',')
          .flatMap((value) => {
            const valueParts = value.split('/');

            if (valueParts.length > 2) {
              throw new Error(`Invalid value "${str} for "${unit.type}"`);
            }

            let parsedValues: number[];
            const left = valueParts[0];
            const right = valueParts[1];

            if (left === '*') {
              parsedValues = range(unit.min, unit.max);
            } else {
              parsedValues = parseRange(left, str, unit);
            }

            const step = parseStep(right, unit);
            const intervalValues = applyInterval(parsedValues, step);

            return intervalValues;
          }),
        unit
      )
    )
  );

  const value = outOfRange(values, unit);

  if (typeof value !== 'undefined') {
    throw new Error(`Value "${value}" out of range for ${unit.type}`);
  }

  // Prevent to return full array
  // If all values are selected we don't want any selection visible
  if (values.length === unit.total) {
    return [];
  }

  return values;
}

/**
 * Parses a cron string to an array of parts
 */
export function parseCronString(str: string) {
  if (typeof str !== 'string') {
    throw new Error('Invalid cron string');
  }

  const parts = str.replace(/\s+/g, ' ').trim().split(' ');

  if (parts.length === 5) {
    return parts.map((partStr, idx) => {
      return parsePartString(partStr, UNITS[idx]);
    });
  }

  throw new Error('Invalid cron string format');
}

export function getPeriodFromCronParts(cronParts: number[][]): PeriodValues {
  if (cronParts[3].length > 0) {
    return PeriodValues.YEAR;
  } else if (cronParts[2].length > 0) {
    return PeriodValues.MONTH;
  } else if (cronParts[4].length > 0) {
    return PeriodValues.WEEK;
  } else if (cronParts[1].length > 0) {
    return PeriodValues.DAY;
  } else if (cronParts[0].length > 0) {
    return PeriodValues.HOUR;
  }

  return PeriodValues.MINUTE;
}

export function toUiFields(fields: CronFields): UiCronFields {
  const isSecondEqual = isEqual(fields.second, EVERY_SECOND);
  const isMinuteEqual = isEqual(fields.minute, EVERY_MINUTE);
  const isHourEqual = isEqual(fields.hour, EVERY_HOUR);
  const isDayOfWeekEqual = isEqual(fields.dayOfWeek, EVERY_DAY_OF_WEEK);
  const isDayOfMonthEqual = isEqual(fields.dayOfMonth, EVERY_DAY_OF_MONTH);
  const isMonthEqual = isEqual(fields.month, EVERY_MONTH);

  return {
    second: isSecondEqual ? [] : (fields.second as number[]),
    minute: isMinuteEqual ? [] : (fields.minute as number[]),
    hour: isHourEqual ? [] : (fields.hour as number[]),
    dayOfWeek: isDayOfWeekEqual ? [] : (fields.dayOfWeek as number[]),
    dayOfMonth: isDayOfMonthEqual ? [] : (fields.dayOfMonth as number[]),
    month: isMonthEqual ? [] : (fields.month as number[]),
  };
}

export function toCronFields(fields: UiCronFields): CronFields {
  return {
    second: (fields.second.length === 0 ? EVERY_SECOND : fields.second) as SixtyRange[],
    minute: (fields.minute.length === 0 ? EVERY_MINUTE : fields.minute) as SixtyRange[],
    hour: (fields.hour.length === 0 ? EVERY_HOUR : fields.hour) as HourRange[],
    dayOfWeek: (fields.dayOfWeek.length === 0 ? EVERY_DAY_OF_WEEK : fields.dayOfWeek) as DayOfTheWeekRange[],
    dayOfMonth: (fields.dayOfMonth.length === 0 ? EVERY_DAY_OF_MONTH : fields.dayOfMonth) as DayOfTheMonthRange[],
    month: (fields.month.length === 0 ? EVERY_MONTH : fields.month) as MonthRange[],
  };
}

export function getCronBasedOnPeriod(
  period: PeriodValues,
  { minute, hour, dayOfWeek, dayOfMonth, month }: UiCronFields
) {
  let cron = EVERY_MINUTE_CRON;

  if (period === PeriodValues.HOUR) {
    const cronFields = toCronFields({
      second: [...EVERY_SECOND],
      minute: isEveryMinute(minute) ? [0] : minute,
      hour: [...EVERY_HOUR],
      dayOfWeek: [...EVERY_DAY_OF_WEEK],
      dayOfMonth: [...EVERY_DAY_OF_MONTH],
      month: [...EVERY_MONTH],
    });
    cron = cronParser.fieldsToExpression(cronFields).stringify();
  } else if (period === PeriodValues.DAY) {
    const cronFields = toCronFields({
      second: [...EVERY_SECOND],
      minute: isEveryMinute(minute) ? [0] : minute,
      hour: isEveryHour(hour) ? [12] : hour,
      dayOfWeek: [...EVERY_DAY_OF_WEEK],
      dayOfMonth: [...EVERY_DAY_OF_MONTH],
      month: [...EVERY_MONTH],
    });
    cron = cronParser.fieldsToExpression(cronFields).stringify();
  } else if (period === PeriodValues.WEEK) {
    const cronFields = toCronFields({
      second: [...EVERY_SECOND],
      minute: isEveryMinute(minute) ? [0] : minute,
      hour: isEveryHour(hour) ? [12] : hour,
      dayOfWeek: isEveryDayOfWeek(dayOfWeek) ? [1] : dayOfWeek,
      dayOfMonth: [...EVERY_DAY_OF_MONTH],
      month: [...EVERY_MONTH],
    });
    cron = cronParser.fieldsToExpression(cronFields).stringify();
  } else if (period === PeriodValues.MONTH) {
    const cronFields = toCronFields({
      second: [...EVERY_SECOND],
      minute: isEveryMinute(minute) ? [0] : minute,
      hour: isEveryHour(hour) ? [12] : hour,
      dayOfWeek: isEveryDayOfWeek(dayOfWeek) ? [1] : dayOfWeek,
      dayOfMonth: isEveryDayOfMonth(dayOfMonth) ? [1] : dayOfMonth,
      month: [...EVERY_MONTH],
    });
    cron = cronParser.fieldsToExpression(cronFields).stringify();
  } else if (period === PeriodValues.YEAR) {
    const cronFields = toCronFields({
      second: [...EVERY_SECOND],
      minute: isEveryMinute(minute) ? [0] : minute,
      hour: isEveryHour(hour) ? [12] : hour,
      dayOfWeek: isEveryDayOfWeek(dayOfWeek) ? [1] : dayOfWeek,
      dayOfMonth: isEveryDayOfMonth(dayOfMonth) ? [1] : dayOfMonth,
      month: isEveryMonth(month) ? [1] : month,
    });
    cron = cronParser.fieldsToExpression(cronFields).stringify();
  }

  return cron;
}
