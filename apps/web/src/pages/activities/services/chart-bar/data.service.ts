import cloneDeep from 'lodash.clonedeep';
import { ScriptableContext } from 'chart.js';
import { format, subDays } from 'date-fns';
import { colors } from '@novu/design-system';
import { IActivityGraphStats, IChartData } from '../../interfaces';
import { activityGraphStatsMock } from '../../consts';

export function getChartData(data: IActivityGraphStats[] | undefined, isDark: boolean): IChartData {
  if (!data || data?.length === 0) {
    return buildChartDataContainer(activityGraphStatsMock, isDark);
  }

  if (data.length < 7) {
    return buildChartDataContainer(fillWeekData(data), isDark);
  }

  return buildChartDataContainer(data, isDark);
}

function buildChartDataContainer(data: IActivityGraphStats[], isDark: boolean): any {
  return {
    datasets: [
      {
        backgroundColor: isDark ? colors.B20 : colors.BGLight,
        hoverBackgroundColor: createGradientColor(),
        data: buildChartData(data),
        borderRadius: 7,
        parsing: {
          xAxisKey: 'dateLabel',
          yAxisKey: 'count',
        },
      },
    ],
  };
}

function fillWeekData(data: IActivityGraphStats[]) {
  const fullWeekData = cloneDeep(data);
  for (let i = data.length - 1; i < 6; i += 1) {
    const earliestDate = fullWeekData[i]._id;
    const newDate = format(subDays(new Date(earliestDate), 1), 'yyyy-MM-dd');

    fullWeekData.push({ _id: newDate, count: 0, templates: [], channels: [] });
  }

  return fullWeekData;
}

function buildChartData(data: IActivityGraphStats[]): Array<IActivityGraphStats & { dateLabel: string }> {
  return data.map((item) => {
    const titleDate = new Date(item._id);

    return {
      ...item,
      dateLabel: `${format(titleDate, 'EEE')} ${format(titleDate, 'dd')}/${format(titleDate, 'MM')}`,
    };
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
