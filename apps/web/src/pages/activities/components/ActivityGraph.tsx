import { useQuery } from 'react-query';
import styled from '@emotion/styled';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import moment from 'moment';
import { getActivityGraphStats } from '../../../api/activity';
import { IActivityGraphStats } from '../interfaces';
import { MessageContainer } from './MessageContainer';
import { ActivityGraphGlobalStyles } from './ActivityGraphGlobalStyles';
import { getOptions, getChartData } from '../services';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function ActivityGraph() {
  const [isTriggerSent, setIsTriggerSent] = useState<boolean>(false);
  const [graphState, setGraphState] = useState<IActivityGraphStats[]>([]);
  const { data: activityGraphStats, isLoading: loadingActivityStats } = useQuery<IActivityGraphStats[]>(
    'activityGraphStats',
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

  return (
    <Wrapper>
      <ActivityGraphGlobalStyles isTriggerSent={isTriggerSent} isDark={isDark} />

      {!isTriggerSent ? <MessageContainer isDark={isDark} /> : null}

      {!loadingActivityStats ? (
        <Bar
          id="chart-bar-styles"
          options={getOptions(isTriggerSent, activityGraphStatsLength)}
          data={getChartData(graphState, isDark)}
        />
      ) : null}
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
`;

function fillDateGaps(data: IActivityGraphStats[]): IActivityGraphStats[] {
  return data.reduce(
    (
      newArray: IActivityGraphStats[],
      currentModel: IActivityGraphStats,
      index: number,
      originalArray: IActivityGraphStats[]
    ) => {
      const nextModel = originalArray[index + 1];

      if (nextModel) {
        const currentDate = moment(currentModel._id);
        const daysBetween = moment(nextModel._id).diff(currentDate, 'days') * -1;
        const fillerDates = Array.from({ length: daysBetween - 1 }, (value, dayIndex) => {
          return {
            count: 0,
            _id: moment(currentDate)
              .subtract(dayIndex + 1, 'days')
              .format('YYYY-MM-DD'),
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
