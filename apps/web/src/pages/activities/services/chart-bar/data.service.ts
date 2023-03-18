import { ScriptableContext } from 'chart.js';
import {
  format,
  getDayOfYear,
  getYear,
  setDayOfYear,
  setWeek,
  setMonth,
  setYear,
  getWeek,
  getMonth,
  isAfter,
  addMonths,
  addWeeks,
  addDays,
} from 'date-fns';
import { IActivityGraphStats, IChartData } from '../../interfaces';
import { StepTypeEnum, ChannelTypeEnum } from '@novu/shared';

const colorMap = {
  [StepTypeEnum.IN_APP]: 'teal',
  [StepTypeEnum.CHAT]: 'orange',
  [StepTypeEnum.EMAIL]: 'red',
  [StepTypeEnum.PUSH]: 'indigo',
  [StepTypeEnum.SMS]: 'green',
};
export const ALL_CHANNELS = Object.values(ChannelTypeEnum);
export function getChartData(data: IActivityGraphStats[], isDark: boolean): IChartData {
  return buildChartDataContainer(data, isDark);
}

function buildChartDataContainer(data: IActivityGraphStats[], isDark: boolean): any {
  return buildChartData(data);
}

function getFormattedDate(date: Date, unit: string) {
  return unit === 'month'
    ? format(date, 'MMM yyyy')
    : unit === 'week'
    ? format(date, "wo 'Week'/yyyy")
    : format(date, 'EEE dd/MMM');
}

function getNextDate(date, unit) {
  return unit === 'month' ? addMonths(date, 1) : unit === 'week' ? addWeeks(date, 1) : addDays(date, 1);
}
function getPeriod(date, unit) {
  return unit === 'month' ? getMonth(date) : unit === 'week' ? getWeek(date) : getDayOfYear(date);
}

function getStartEndDates(graphData, unit) {
  let start = graphData[0]._id;
  let end = graphData[0]._id;
  for (const data of graphData) {
    if (start.year > data._id.year || (start.year === data._id.year && start[unit] > data._id[unit])) start = data._id;
    if (end.year < data._id.year || (end.year === data._id.year && end[unit] < data._id[unit])) end = data._id;
  }
  let startDate = setYear(new Date(), start.year);
  startDate =
    unit === 'month'
      ? setMonth(startDate, start.month)
      : unit === 'week'
      ? setWeek(startDate, start.week)
      : setDayOfYear(startDate, start.day);

  let endDate = setYear(new Date(), end.year);
  endDate =
    unit === 'month'
      ? setMonth(endDate, end.month)
      : unit === 'week'
      ? setWeek(endDate, end.week)
      : setDayOfYear(endDate, end.day);

  return { startDate, endDate };
}

function buildChartData(graphData: IActivityGraphStats[]) {
  const datasets: any = [];
  if (graphData.length === 0) return { datasets };

  const unit = graphData[0]._id.hasOwnProperty('month')
    ? 'month'
    : graphData[0]._id.hasOwnProperty('week')
    ? 'week'
    : 'day';

  const { startDate, endDate } = getStartEndDates(graphData, unit);
  let totalCount = 0;
  for (const channel of ALL_CHANNELS) {
    let record = datasets.find((cdata) => cdata.label === channel);
    if (!record) {
      record = {
        label: channel,
        borderColor: colorMap[channel],
        backgroundColor: colorMap[channel],
        hoverBackgroundColor: createGradientColor(),
        maxBarThickness: 90,
        count: 0,
        data: [],
      };
      datasets.push(record);
    }
    for (let date = startDate; !isAfter(date, endDate); date = getNextDate(date, unit)) {
      const year = getYear(date);
      const period = getPeriod(date, unit);
      let rawData: any = graphData.find(
        (data) => data._id.year === year && data._id[unit] === period && data._id.type === channel
      );
      if (!rawData) rawData = { count: 0, _id: { year, [unit]: period } };
      const xLabel = getFormattedDate(date, unit);
      record.data.push({ xLabel, ...rawData });
      record.count += rawData.count;
      totalCount += rawData.count;
    }
  }

  return { datasets };
}

function createGradientColor() {
  return (context: ScriptableContext<'bar' | 'line'>) => {
    const { ctx } = context.chart;
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, '#DD2476');
    gradient.addColorStop(1, '#FF512F');

    return gradient;
  };
}
