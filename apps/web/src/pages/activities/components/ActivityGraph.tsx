import { useQuery } from 'react-query';
import styled from '@emotion/styled';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  ScriptableContext,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import moment from 'moment';
import { useEffect, useState } from 'react';
import * as cloneDeep from 'lodash.clonedeep';
import { getActivityGraphStats } from '../../../api/activity';
import { colors } from '../../../design-system';
import { IActivityGraphStats, IChartData } from '../interfaces';
import { activityGraphStatsMock } from '../consts';
import { MessageContainer } from './MessageContainer';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function ActivityGraph() {
  const [isTriggerSent, setIsTriggerSent] = useState<boolean>(false);
  const { data: activityGraphStats, isLoading: loadingActivityStats } = useQuery<IActivityGraphStats[]>(
    'activityGraphStats',
    getActivityGraphStats
  );

  useEffect(() => {
    if (checkIsTriggerSent(activityGraphStats)) {
      setIsTriggerSent(true);
    }
  }, [activityGraphStats]);

  const activityGraphStatsLength = activityGraphStats?.length ? activityGraphStats?.length : 0;

  return (
    <Wrapper>
      {!isTriggerSent ? <MessageContainer /> : null}

      {!loadingActivityStats ? (
        <StyledBar
          isTriggerSent={isTriggerSent}
          options={getOptions(isTriggerSent, activityGraphStatsLength)}
          data={getDataChartJs(activityGraphStats)}
        />
      ) : null}
    </Wrapper>
  );
}

function checkIsTriggerSent(activityGraphStats: IActivityGraphStats[] | undefined) {
  return activityGraphStats?.length && activityGraphStats?.length > 0;
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

function getDataChartJs(data: IActivityGraphStats[] | undefined): IChartData {
  if (!data || data?.length === 0) {
    return buildChartDataContainer(activityGraphStatsMock);
  }

  if (data.length < 7) {
    return buildChartDataContainer(fillWeekData(data));
  }

  return buildChartDataContainer(data);
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

function getOptions(this: any, isTriggerSent: boolean, daysCount: number) {
  return {
    maintainAspectRatio: false,
    responsive: true,
    height: 300,

    legend: {
      display: false,
    },

    scales: getScalesConfiguration.call(this, daysCount),

    plugins: {
      tooltip: getTooltipConfiguration(),
      legend: hideTitle(),
    },
  };
}

function showLabel(this: any, value) {
  return this.getLabelForValue(value);
}

function getScalesConfiguration(daysCount: number) {
  return {
    x: {
      reverse: true,
      grid: {
        display: false,
      },
      ticks: {
        callback(value, index) {
          if (daysCount < 8) {
            return showLabel.call(this, value);
          }

          return hideEverySecondTickLabel.call(this, index, value);
        },
      },
    },
    y: {
      display: false,
    },
  };
}

function hideTitle() {
  return {
    display: false,
  };
}

function getTooltipConfiguration() {
  return {
    legend: {
      display: false,
    },

    // Disable the on-canvas tooltip
    enabled: false,

    external: (context) => {
      // Tooltip Element
      let tooltipEl = document.getElementById('chartjs-tooltip');

      // Create element on first render
      if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chartjs-tooltip';
        tooltipEl.innerHTML = '<table></table>';
        document.body.appendChild(tooltipEl);
      }

      // Hide if no tooltip
      const tooltipModel = context.tooltip;
      if (tooltipModel.opacity === 0) {
        tooltipEl.style.opacity = '0';

        return;
      }

      // Set caret Position
      tooltipEl.classList.remove('above', 'below', 'no-transform');
      if (tooltipModel.yAlign) {
        tooltipEl.classList.add(tooltipModel.yAlign);
      } else {
        tooltipEl.classList.add('no-transform');
      }

      function getBody(bodyItem) {
        return bodyItem.lines;
      }

      // Set Text
      if (tooltipModel.body) {
        const titleLines = tooltipModel.title || [];
        const bodyLines = tooltipModel.body.map(getBody);

        let innerHtml = '';

        innerHtml = buildTitle(innerHtml, titleLines);

        innerHtml = buildBody(innerHtml, bodyLines);

        updateTableInnerHtml(tooltipEl, innerHtml);
      }

      updateToolTipStyles(context, tooltipEl, tooltipModel);
    },
  };
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

function hideEverySecondTickLabel(this: any, index, val) {
  return index % 2 === 0 ? this.getLabelForValue(val) : '';
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

const StyledBar = styled(Bar)<{ isTriggerSent: boolean }>`
  height: 175px;
  filter: ${({ isTriggerSent }) => (isTriggerSent ? 'none' : 'blur(4px)')};
  pointer-events: ${({ isTriggerSent }) => (isTriggerSent ? 'auto' : 'none')};
`;

const Wrapper = styled.div`
  background: rgba(30, 30, 38, 0.5);
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

function buildDisplayTitle(title) {
  const dayMonth = title.split(',')[1].split('/');
  const dateString = `1992-0${dayMonth[1]}-${dayMonth[0]}T00:00:00-00:00`;
  const data = moment(dateString);

  return `${data.format('dddd')}, ${data.format('MMMM')} ${data.format('Do')}`;
}

function getTitleStyle() {
  let titleStyle = 'display: flex;';

  titleStyle += 'justify-content: center;';
  titleStyle += '; height: 17px';
  titleStyle += '; margin-bottom: 4px';
  titleStyle += '; border-width: 22px';
  titleStyle += '; border-width: 22px';
  titleStyle += `; color: ${colors.B60}`;

  return titleStyle;
}

function getBodyStyle() {
  let style = 'position: static';

  style += '; display: flex;';
  style += '; justify-content: center;';
  style += '; height: 17px';
  style += '; border-width: 22px';
  style += `; color: #FF512F`;

  style += `; background: -webkit-linear-gradient(90deg, #dd2476 0%, #ff512f 100%)`;
  style += `; -webkit-background-clip: text`;
  style += `; -webkit-text-fill-color: transparent`;

  return style;
}

function buildTitle(html: string, titleLines: any[]) {
  let resHtml = html;

  resHtml += '<div class="tooltip-title">';

  titleLines.forEach(function (title) {
    const displayTitle = buildDisplayTitle(title);

    const titleStyle = getTitleStyle();

    resHtml += `<span style="${titleStyle}" >${displayTitle}</th></tr>`;
  });
  resHtml += '</div>';

  return resHtml;
}

function getBodyText(body: string[]): string | string[] {
  const total = body.find((x) => x.toLowerCase().includes('total'));
  if (total) {
    const count = total.split(':')[1];

    return `${count} Total`;
  }

  return body;
}

function buildBody(html: string, bodyLines) {
  let resHtml = html;

  resHtml += '<div class="tooltip-body">';
  bodyLines.forEach(function (body) {
    const style = getBodyStyle();

    const bodyText = getBodyText(body);

    resHtml += `<span style="${style}">${bodyText}</span>`;
  });
  resHtml += '</div>';

  return resHtml;
}

function updateTableInnerHtml(tooltipEl: HTMLElement, innerHtml: string) {
  const tableRoot = tooltipEl.querySelector('table');

  if (tableRoot) {
    tableRoot.innerHTML = innerHtml;
  }
}

function updateToolTipStyles(context, tooltipEl: HTMLElement, tooltipModel) {
  const position = context.chart.canvas.getBoundingClientRect();

  /* eslint-disable no-param-reassign */
  tooltipEl.style.background = colors.B20;
  tooltipEl.style.borderRadius = '7px';
  tooltipEl.style.padding = '12px 15px 14px 15px';
  tooltipEl.style.opacity = '1';
  tooltipEl.style.position = 'absolute';
  tooltipEl.style.left = `${position.left + window.scrollX + tooltipModel.caretX - tooltipModel.width - 15}px`;
  tooltipEl.style.top = `${position.top + window.scrollY + tooltipModel.caretY - tooltipModel.height - 26}px`;
  tooltipEl.style.pointerEvents = 'none';
  /* eslint-enable no-param-reassign */
}
