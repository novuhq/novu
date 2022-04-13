import * as cloneDeep from 'lodash.clonedeep';
import moment from 'moment';
import { ScriptableContext } from 'chart.js';
import { IActivityGraphStats, IChartData } from '../../interfaces';
import { activityGraphStatsMock } from '../../consts';
import { colors } from '../../../../design-system';

export function getChartData(data: IActivityGraphStats[] | undefined, isDark: boolean): IChartData {
  if (!data || data?.length === 0) {
    return buildChartDataContainer(activityGraphStatsMock, isDark);
  }

  if (data.length < 7) {
    return buildChartDataContainer(fillWeekData(data), isDark);
  }

  return buildChartDataContainer(data, isDark);
}

function buildChartDataContainer(data: IActivityGraphStats[], isDark: boolean): IChartData {
  return {
    labels: buildChartDateLabels(data),
    datasets: [
      {
        backgroundColor: isDark ? colors.B20 : colors.BGLight,
        hoverBackgroundColor: createGradientColor(),
        data: buildChartData(data),
        borderRadius: 7,
      },
    ],
  };
}

function fillWeekData(data: IActivityGraphStats[]) {
  const fullWeekData = cloneDeep(data);
  // eslint-disable-next-line no-plusplus
  for (let i = data.length - 1; i < 6; i++) {
    const earliestDate = fullWeekData[i]._id;
    const newDate = moment(earliestDate, 'YYYY-MM-DD').subtract(1, 'days').format('YYYY-MM-DD');

    fullWeekData.push({ _id: newDate, count: 0 });
  }

  return fullWeekData;
}

function buildChartDateLabels(data: IActivityGraphStats[]): string[][] {
  return data.map((item) => {
    const titleDate = moment(item._id);

    return [titleDate.format('ddd'), `${titleDate.date()}/${titleDate.month() + 1}`];
  });
}

function buildChartData(data: IActivityGraphStats[]) {
  return data.map((item) => {
    return item.count;
  });
}

function createGradientColor() {
  return (context: ScriptableContext<'bar'>) => {
    const { ctx } = context.chart;
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);

    gradient.addColorStop(0, '#DD2476');
    gradient.addColorStop(1, '#FF512F');

    return gradient;
  };
}
