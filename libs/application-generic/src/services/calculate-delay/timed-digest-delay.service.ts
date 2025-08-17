// cSpell:ignore RRULE, BYSETPOS, BYMONTHDAY, bysetpos, byweekday, bymonthday, byhour, byminute, bysecond, dtstart

import { DaysEnum, DigestUnitEnum, ITimedConfig, MonthlyTypeEnum, OrdinalEnum, OrdinalValueEnum } from '@novu/shared';
import { addDays, addHours, addMinutes, addMonths, addWeeks, differenceInMilliseconds } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { Frequency, RRule, Weekday } from 'rrule';

const UNIT_TO_RRULE_FREQUENCY = {
  [DigestUnitEnum.MINUTES]: Frequency.MINUTELY,
  [DigestUnitEnum.HOURS]: Frequency.HOURLY,
  [DigestUnitEnum.DAYS]: Frequency.DAILY,
  [DigestUnitEnum.WEEKS]: Frequency.WEEKLY,
  [DigestUnitEnum.MONTHS]: Frequency.MONTHLY,
};

const DAY_OF_WEEK_TO_RRULE_DAY = {
  [DaysEnum.MONDAY]: RRule.MO,
  [DaysEnum.TUESDAY]: RRule.TU,
  [DaysEnum.WEDNESDAY]: RRule.WE,
  [DaysEnum.THURSDAY]: RRule.TH,
  [DaysEnum.FRIDAY]: RRule.FR,
  [DaysEnum.SATURDAY]: RRule.SA,
  [DaysEnum.SUNDAY]: RRule.SU,
};

const ORDINAL_TO_RRULE_BYSETPOS = {
  [OrdinalEnum.FIRST]: 1,
  [OrdinalEnum.SECOND]: 2,
  [OrdinalEnum.THIRD]: 3,
  [OrdinalEnum.FOURTH]: 4,
  [OrdinalEnum.FIFTH]: 5,
  [OrdinalEnum.LAST]: -1,
};

const ORDINAL_VALUE_TO_RRULE_RRULE_DAY = {
  [OrdinalValueEnum.MONDAY]: RRule.MO,
  [OrdinalValueEnum.TUESDAY]: RRule.TU,
  [OrdinalValueEnum.WEDNESDAY]: RRule.WE,
  [OrdinalValueEnum.THURSDAY]: RRule.TH,
  [OrdinalValueEnum.FRIDAY]: RRule.FR,
  [OrdinalValueEnum.SATURDAY]: RRule.SA,
  [OrdinalValueEnum.SUNDAY]: RRule.SU,
};

const ORDINAL_TO_RRULE_BYMONTHDAY = {
  [OrdinalEnum.FIRST]: 1,
  [OrdinalEnum.SECOND]: 2,
  [OrdinalEnum.THIRD]: 3,
  [OrdinalEnum.FOURTH]: 4,
  [OrdinalEnum.FIFTH]: 5,
  [OrdinalEnum.LAST]: -1,
};

interface ICalculateArgs {
  dateStart?: Date;
  unit: DigestUnitEnum;
  amount: number;
  timeConfig?: ITimedConfig;
  timezone?: string;
}

export class TimedDigestDelayService {
  /**
   * Calculates the delay time in milliseconds between the time for the next schedule and current time
   * @returns the delay time in milliseconds
   */
  public static calculate({
    dateStart = new Date(),
    unit = DigestUnitEnum.MINUTES,
    amount,
    timeConfig: { atTime, weekDays, monthDays, monthlyType = MonthlyTypeEnum.EACH, ordinal, ordinalValue } = {},
    timezone,
  }: ICalculateArgs): number {
    const [hours, minutes, seconds] = atTime ? atTime.split(':').map((part) => parseInt(part, 10)) : [];
    const dateStartTz = timezone ? toZonedTime(dateStart, timezone) : dateStart;
    const currentTimeTz = timezone ? toZonedTime(new Date(), timezone) : new Date();

    const { bysetpos, byweekday, bymonthday } = TimedDigestDelayService.calculateByFields({
      weekDays,
      monthDays,
      monthlyType,
      ordinal,
      ordinalValue,
    });

    const rule = new RRule({
      dtstart: dateStartTz,
      until: TimedDigestDelayService.getUntilDate(dateStartTz, unit, amount, timezone),
      freq: UNIT_TO_RRULE_FREQUENCY[unit],
      interval: amount,
      bysetpos,
      byweekday,
      bymonthday,
      byhour: hours,
      byminute: minutes,
      bysecond: seconds,
    });

    const next = rule.after(dateStartTz);

    if (next === null) {
      throw new Error('Delay for next digest could not be calculated');
    }

    const nextUtc = timezone ? fromZonedTime(next, timezone) : next;
    const currentUtc = timezone ? fromZonedTime(currentTimeTz, timezone) : currentTimeTz;

    return differenceInMilliseconds(nextUtc, currentUtc);
  }

  private static calculateByFields({ weekDays, monthDays, monthlyType, ordinal, ordinalValue }: ITimedConfig) {
    let byweekday: Weekday[] | undefined;
    let bymonthday: number | number[] | undefined;

    if (monthlyType === MonthlyTypeEnum.EACH) {
      byweekday = weekDays?.map((el) => DAY_OF_WEEK_TO_RRULE_DAY[el]);
      bymonthday = monthDays;

      return { byweekday, bymonthday };
    }

    switch (ordinalValue) {
      case OrdinalValueEnum.DAY: {
        return { bymonthday: ORDINAL_TO_RRULE_BYMONTHDAY[ordinal] };
      }
      case OrdinalValueEnum.WEEKDAY: {
        return {
          bysetpos: ORDINAL_TO_RRULE_BYSETPOS[ordinal],
          byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
        };
      }
      case OrdinalValueEnum.WEEKEND: {
        return {
          bysetpos: ORDINAL_TO_RRULE_BYSETPOS[ordinal],
          byweekday: [RRule.SA, RRule.SU],
        };
      }
      default: {
        return {
          bysetpos: ORDINAL_TO_RRULE_BYSETPOS[ordinal],
          byweekday: ORDINAL_VALUE_TO_RRULE_RRULE_DAY[ordinalValue],
        };
      }
    }
  }

  private static getUntilDate(dateStart: Date, unit: DigestUnitEnum, amount: number, timezone?: string): Date {
    let untilDate: Date;

    switch (unit) {
      case DigestUnitEnum.MINUTES:
        untilDate = addMinutes(dateStart, amount);
        break;
      case DigestUnitEnum.HOURS:
        untilDate = addHours(dateStart, amount);
        break;
      case DigestUnitEnum.DAYS:
        untilDate = addDays(dateStart, amount);
        break;
      case DigestUnitEnum.WEEKS:
        untilDate = addWeeks(dateStart, amount);
        break;
      case DigestUnitEnum.MONTHS:
        untilDate = addMonths(dateStart, amount);
        break;
      default:
        untilDate = addMonths(dateStart, amount);
        break;
    }

    return timezone ? fromZonedTime(untilDate, timezone) : untilDate;
  }
}
