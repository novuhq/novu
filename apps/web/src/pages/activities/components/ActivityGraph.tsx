import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useMantineTheme } from '@mantine/core';
import * as cloneDeep from 'lodash.clonedeep';
import { differenceInDays, format, isSameDay, subDays } from 'date-fns';

import { MessageContainer } from './MessageContainer';
import { ActivityGraphGlobalStyles } from './ActivityGraphGlobalStyles';
import { getActivityGraphStats } from '../../../api/activity';
import { IActivityGraphStats } from '../interfaces';
import { getOptions, getChartData } from '../services';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function ActivityGraph({ onBarClick }: { onBarClick: (item: IActivityGraphStats) => void }) {
  const chartRef = useRef();
  const [isTriggerSent, setIsTriggerSent] = useState<boolean>(false);
  const [graphState, setGraphState] = useState<IActivityGraphStats[]>([]);
  const { data: activityGraphStats, isLoading: loadingActivityStats } = useQuery<IActivityGraphStats[]>(
    ['activityGraphStats'],
    getActivityGraphStats
  );
  const isDark = useMantineTheme().colorScheme === 'dark';

  useEffect(() => {
    if (!activityGraphStats) return;

    if (checkIsTriggerSent(activityGraphStats)) {
      setGraphState(fillDateGaps(activityGraphStats));
      setIsTriggerSent(true);
    }
  }, [activityGraphStats]);

  const activityGraphStatsLength = graphState?.length ? graphState?.length : 0;

  const options = useMemo(
    () => getOptions(isTriggerSent, activityGraphStatsLength),
    [isTriggerSent, activityGraphStatsLength]
  );

  const data = useMemo(() => getChartData(graphState, isDark), [graphState, isDark]);

  const onClick = (event) => {
    const [barItem] = getElementAtEvent(chartRef.current as any, event);
    if (barItem) {
      const { datasetIndex } = barItem;
      const item = data.datasets[datasetIndex].data[barItem.index];

      onBarClick(item);
    }
  };

  return (
    <Wrapper>
      <ActivityGraphGlobalStyles isTriggerSent={isTriggerSent} isDark={isDark} />

      {!isTriggerSent && !loadingActivityStats ? <MessageContainer isDark={isDark} /> : null}

      <Bar ref={chartRef} id="chart-bar-styles" options={options} data={data} onClick={onClick} />
    </Wrapper>
  );
}

function checkIsTriggerSent(activityGraphStats: IActivityGraphStats[] | undefined) {
  return activityGraphStats?.length && activityGraphStats?.length > 0;
}

const Wrapper = styled.div`
  padding: 0 30px;
  display: flex;
  align-items: center;
  flex-direction: column;
  position: relative;
`;

function fillDateGaps(data: IActivityGraphStats[]): IActivityGraphStats[] {
  const containsCurrentDate = unshiftCurrentDay(data);

  return containsCurrentDate.reduce(
    (
      newArray: IActivityGraphStats[],
      currentModel: IActivityGraphStats,
      index: number,
      originalArray: IActivityGraphStats[]
    ) => {
      const nextModel = originalArray[index + 1];

      if (nextModel) {
        const currentDate = new Date(currentModel._id);
        const daysBetween = differenceInDays(currentDate, new Date(nextModel._id));
        const fillerDates = Array.from({ length: daysBetween - 1 }, (_value, dayIndex) => {
          return {
            _id: format(subDays(currentDate, dayIndex + 1), 'yyyy-MM-dd'),
            count: 0,
            templates: [],
            channels: [],
          };
        });

        newArray.push(currentModel, ...fillerDates);
      } else {
        newArray.push(currentModel);
      }

      return newArray;
    },
    []
  );
}

function unshiftCurrentDay(data: IActivityGraphStats[]): IActivityGraphStats[] {
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  const isContainsCurrentDate = isSameDay(new Date(data[0]._id), new Date(currentDate));

  if (isContainsCurrentDate) return data;

  const clonedDate = cloneDeep(data);
  clonedDate.unshift({ _id: currentDate, count: 0, templates: [], channels: [] });

  return clonedDate;
}
