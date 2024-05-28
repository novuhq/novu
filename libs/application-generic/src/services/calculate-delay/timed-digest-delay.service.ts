// cSpell:ignore RRULE, BYSETPOS, BYMONTHDAY, bysetpos, byweekday, bymonthday, byhour, byminute, bysecond, dtstart
import {
  differenceInMilliseconds,
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
} from 'date-fns';
import { RRule, Frequency, Weekday } from 'rrule';
import {
  DaysEnum,
  DigestUnitEnum,
  ITimedConfig,
  MonthlyTypeEnum,
  OrdinalEnum,
  OrdinalValueEnum,
} from '@novu/shared';

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
    timeConfig: {
      atTime,
      weekDays,
      monthDays,
      monthlyType = MonthlyTypeEnum.EACH,
      ordinal,
      ordinalValue,
    } = {},
  }: ICalculateArgs): number {
    const [hours, minutes, seconds] = atTime
      ? atTime.split(':').map((part) => parseInt(part, 10))
      : [];

    const { bysetpos, byweekday, bymonthday } = this.calculateByFields({
      weekDays,
      monthDays,
      monthlyType,
      ordinal,
      ordinalValue,
    });

    const rule = new RRule({
      dtstart: dateStart,
      until: this.getUntilDate(dateStart, unit, amount),
      freq: UNIT_TO_RRULE_FREQUENCY[unit],
      interval: amount,
      bysetpos,
      byweekday,
      bymonthday,
      byhour: hours,
      byminute: minutes,
      bysecond: seconds,
    });

    const next = rule.after(dateStart);

    if (next === null) {
      throw new Error('Delay for next digest could not be calculated');
    }

    return differenceInMilliseconds(next, new Date());
  }

  private static calculateByFields({
    weekDays,
    monthDays,
    monthlyType,
    ordinal,
    ordinalValue,
  }: ITimedConfig) {
    let byweekday: Weekday[] | undefined = undefined;
    let bymonthday: number | number[] | undefined = undefined;

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

  private static getUntilDate(
    dateStart: Date,
    unit: DigestUnitEnum,
    amount: number
  ): Date {
    switch (unit) {
      case DigestUnitEnum.MINUTES:
        return addMinutes(dateStart, amount);
      case DigestUnitEnum.HOURS:
        return addHours(dateStart, amount);
      case DigestUnitEnum.DAYS:
        return addDays(dateStart, amount);
      case DigestUnitEnum.WEEKS:
        return addWeeks(dateStart, amount);
      case DigestUnitEnum.MONTHS:
        return addMonths(dateStart, amount);
      default:
        return addMonths(dateStart, amount);
    }
  }
}
