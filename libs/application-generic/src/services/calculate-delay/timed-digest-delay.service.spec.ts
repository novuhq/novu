import { DaysEnum, DigestUnitEnum, MonthlyTypeEnum, OrdinalEnum, OrdinalValueEnum } from '@novu/shared';
import { differenceInMilliseconds } from 'date-fns';

import { TimedDigestDelayService } from './timed-digest-delay.service';

describe('TimedDigestDelayService', () => {
  describe('calculate', () => {
    let clock: typeof jest;

    beforeEach(() => {
      const date = new Date('2023-05-04T12:00:00Z');
      clock = jest.useFakeTimers('modern' as FakeTimersConfig);
      clock.setSystemTime(date.getTime());
    });

    afterEach(() => {
      clock.clearAllTimers();
    });

    describe('minutely schedule', () => {
      it('delay timeout for next minute', () => {
        const result = TimedDigestDelayService.calculate({
          unit: DigestUnitEnum.MINUTES,
          amount: 1,
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-04T12:01:00Z'), new Date()));
      });

      it('delay timeout for next 7 minutes', () => {
        const result = TimedDigestDelayService.calculate({
          unit: DigestUnitEnum.MINUTES,
          amount: 7,
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-04T12:07:00Z'), new Date()));
      });
    });

    describe('hourly schedule', () => {
      it('delay timeout for next hour', () => {
        const result = TimedDigestDelayService.calculate({
          unit: DigestUnitEnum.HOURS,
          amount: 1,
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-04T13:00:00Z'), new Date()));
      });

      it('delay timeout for next 10 hours', () => {
        const result = TimedDigestDelayService.calculate({
          unit: DigestUnitEnum.HOURS,
          amount: 10,
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-04T22:00:00Z'), new Date()));
      });
    });

    describe('daily schedule', () => {
      it('delay timeout for next day', () => {
        const dateStart = new Date();
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.DAYS,
          amount: 1,
          timeConfig: {
            atTime: '01:00:00',
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-05T01:00:00.000Z'), new Date()));
      });

      it('delay timeout for next 4 days', () => {
        const dateStart = new Date();
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.DAYS,
          amount: 4,
          timeConfig: {
            atTime: '01:00:00',
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-08T01:00:00.000Z'), new Date()));
      });
    });

    describe('weekly schedule', () => {
      it('delay timeout for next weekly when days are not specified', () => {
        const dateStart = new Date('2023-05-04T00:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.WEEKS,
          amount: 2,
          timeConfig: {
            atTime: '09:00:00',
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-04T09:00:00.000Z'), new Date()));
      });

      it('delay timeout for next weekly when the time is after the "at time"', () => {
        const dateStart = new Date('2023-05-04T10:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.WEEKS,
          amount: 2,
          timeConfig: {
            atTime: '09:00:00',
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-18T09:00:00.000Z'), new Date()));
      });

      it('delay timeout for next scheduled weekly on monday', () => {
        const dateStart = new Date('2023-05-01T00:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.WEEKS,
          amount: 2,
          timeConfig: {
            atTime: '09:00:00',
            weekDays: [DaysEnum.MONDAY, DaysEnum.WEDNESDAY],
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-01T09:00:00.000Z'), new Date()));
      });

      it('delay timeout for next scheduled weekly on wednesday', () => {
        const dateStart = new Date('2023-05-02T00:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.WEEKS,
          amount: 2,
          timeConfig: {
            atTime: '09:00:00',
            weekDays: [DaysEnum.MONDAY, DaysEnum.WEDNESDAY],
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-03T09:00:00.000Z'), new Date()));
      });
    });

    describe('monthly schedule', () => {
      it('delay timeout for next month when month days are not provided', () => {
        const dateStart = new Date('2023-05-03T00:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.MONTHS,
          amount: 3,
          timeConfig: {
            atTime: '12:00:00',
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-03T12:00:00.000Z'), new Date()));
      });

      it('delay timeout for next month when the time is after the "at time"', () => {
        const dateStart = new Date('2023-05-03T13:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.MONTHS,
          amount: 3,
          timeConfig: {
            atTime: '12:00:00',
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-08-03T12:00:00.000Z'), new Date()));
      });

      it('delay timeout for next month first day', () => {
        const dateStart = new Date('2023-05-01T00:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.MONTHS,
          amount: 3,
          timeConfig: {
            atTime: '12:00:00',
            monthDays: [1, 15],
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-01T12:00:00.000Z'), new Date()));
      });

      it('delay timeout for next month fifteenth day', () => {
        const dateStart = new Date('2023-05-03T00:00:00.000Z');
        const result = TimedDigestDelayService.calculate({
          dateStart,
          unit: DigestUnitEnum.MONTHS,
          amount: 3,
          timeConfig: {
            atTime: '12:00:00',
            monthDays: [1, 15],
          },
        });

        expect(result).toEqual(differenceInMilliseconds(new Date('2023-05-15T12:00:00.000Z'), new Date()));
      });

      describe('with "on the" fields', () => {
        describe('ordinal value "day"', () => {
          it('delay timeout for the first day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.FIRST,
                ordinalValue: OrdinalValueEnum.DAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-01T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the second day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.SECOND,
                ordinalValue: OrdinalValueEnum.DAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-02T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the last day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.LAST,
                ordinalValue: OrdinalValueEnum.DAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-30T12:00:00.000Z'), new Date()));
          });
        });

        describe('ordinal value "weekday"', () => {
          it('delay timeout for the first weekday of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-07-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.FIRST,
                ordinalValue: OrdinalValueEnum.WEEKDAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-07-03T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the second weekday of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-07-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.SECOND,
                ordinalValue: OrdinalValueEnum.WEEKDAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-07-04T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the last weekday of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-07-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.LAST,
                ordinalValue: OrdinalValueEnum.WEEKDAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-07-31T12:00:00.000Z'), new Date()));
          });
        });

        describe('ordinal value "weekend day"', () => {
          it('delay timeout for the first weekend day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.FIRST,
                ordinalValue: OrdinalValueEnum.WEEKEND,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-03T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the second weekend day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.SECOND,
                ordinalValue: OrdinalValueEnum.WEEKEND,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-04T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the last weekend day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.LAST,
                ordinalValue: OrdinalValueEnum.WEEKEND,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-25T12:00:00.000Z'), new Date()));
          });
        });

        describe('ordinal value "specific week day"', () => {
          it('delay timeout for the first wednesday of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.FIRST,
                ordinalValue: OrdinalValueEnum.WEDNESDAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-07T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the second sunday of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.SECOND,
                ordinalValue: OrdinalValueEnum.SUNDAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-11T12:00:00.000Z'), new Date()));
          });

          it('delay timeout for the last weekend day of the month', () => {
            const result = TimedDigestDelayService.calculate({
              dateStart: new Date('2023-06-01T12:00:00.000Z'),
              unit: DigestUnitEnum.MONTHS,
              amount: 1,
              timeConfig: {
                atTime: '12:00:00',
                ordinal: OrdinalEnum.LAST,
                ordinalValue: OrdinalValueEnum.SATURDAY,
                monthlyType: MonthlyTypeEnum.ON,
              },
            });

            expect(result).toEqual(differenceInMilliseconds(new Date('2023-06-24T12:00:00.000Z'), new Date()));
          });
        });
      });
    });
  });
});
