import * as cloneDeep from 'lodash.clonedeep';
import moment from 'moment';
import { ScriptableContext } from 'chart.js';
import { IActivityGraphStats, IChartData } from '../../interfaces';
import { activityGraphStatsMock } from '../../consts';
import { colors } from '../../../../design-system';

export function getChartData(data: IActivityGraphStats[] | undefined): IChartData {
  if (!data || data?.length === 0) {
    return buildChartDataContainer(activityGraphStatsMock);
  }

  if (data.length < 7) {
    return buildChartDataContainer(fillWeekData(data));
  }

  return buildChartDataContainer(data);
}

function buildChartDataContainer(data: IActivityGraphStats[]): IChartData {
  return {
    labels: buildChartDateLabels(data),
    datasets: [
      {
        backgroundColor: colors.B20,
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
    const newDate = moment(earliestDate).subtract(1, 'days').format('YYYY-MM-DD');

    fullWeekData.push({ _id: newDate, count: 0 });
  }

  return fullWeekData;
}

function buildChartDateLabels(data: IActivityGraphStats[]): string[][] {
  return data.map((x) => {
    const titleDate = moment(x._id);

    return [titleDate.format('ddd'), `${titleDate.date()}/${titleDate.month() + 1}`];
  });
}

function buildChartData(data: IActivityGraphStats[]) {
  return data.map((x) => {
    return x.count;
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
