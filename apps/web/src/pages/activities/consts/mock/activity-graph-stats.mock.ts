import { IActivityGraphStats } from '../../interfaces';
import { PeriodicityEnum, StepTypeEnum } from '@novu/shared';
import {
  getDayOfYear,
  getYear,
  getWeekYear,
  getMonth,
  getWeek,
  subDays,
  addMonths,
  addWeeks,
  addDays,
  isAfter,
} from 'date-fns';

const JOB_TYPES = [StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT, StepTypeEnum.IN_APP];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function getNextDate(date, unit) {
  return unit === 'month' ? addMonths(date, 1) : unit === 'week' ? addWeeks(date, 1) : addDays(date, 1);
}

function getPeriod(date, unit) {
  return unit === 'month' ? getMonth(date) : unit === 'week' ? getWeek(date) : getDayOfYear(date);
}

export const generateMockData = (filters) => {
  const startDate = filters.range[0];
  const endDate = filters.range[1];
  const periodicity = filters.periodicity;
  const mockData: IActivityGraphStats[] = [];
  const unit =
    periodicity === PeriodicityEnum.MONTHLY ? 'month' : periodicity === PeriodicityEnum.WEEKLY ? 'week' : 'day';
  const MAX_COUNT = unit === 'month' ? 6000 : unit === 'week' ? 1050 : 150;
  if (!startDate || !endDate || isAfter(startDate, endDate)) return { data: [] };
  for (let date = startDate; !isAfter(date, endDate); date = getNextDate(date, unit)) {
    const year = unit === 'week' ? getWeekYear(date) : getYear(date);
    const period = getPeriod(date, unit);
    for (const type of JOB_TYPES) {
      mockData.push({
        _id: {
          type: type,
          [unit]: period,
          year,
        },
        count: randomInt(0, MAX_COUNT),
      });
    }
  }

  return { data: mockData };
};
export const dailyGraphStatsMock: IActivityGraphStats[] = generateMockData({
  range: [subDays(new Date(), 18), new Date()],
  periodicity: PeriodicityEnum.DAILY,
}).data;
