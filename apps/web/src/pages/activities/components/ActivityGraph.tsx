import { useQuery } from 'react-query';
import styled from '@emotion/styled';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { getActivityGraphStats } from '../../../api/activity';
import { IActivityGraphStats } from '../interfaces';
import { MessageContainer } from './MessageContainer';
import { ActivityGraphGlobalStyles } from './ActivityGraphGlobalStyles';
import { getOptions, getChartData } from '../services';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function ActivityGraph() {
  const [isTriggerSent, setIsTriggerSent] = useState<boolean>(false);
  const { data: activityGraphStats, isLoading: loadingActivityStats } = useQuery<IActivityGraphStats[]>(
    'activityGraphStats',
    getActivityGraphStats
  );
  const isDark = useMantineTheme().colorScheme === 'dark';

  useEffect(() => {
    if (checkIsTriggerSent(activityGraphStats)) {
      setIsTriggerSent(true);
    }
  }, [activityGraphStats]);

  const activityGraphStatsLength = activityGraphStats?.length ? activityGraphStats?.length : 0;

  return (
    <Wrapper>
      <ActivityGraphGlobalStyles isTriggerSent={isTriggerSent} isDark={isDark} />

      {!isTriggerSent ? <MessageContainer isDark={isDark} /> : null}

      {!loadingActivityStats ? (
        <Bar
          id="chart-bar-styles"
          options={getOptions(isTriggerSent, activityGraphStatsLength)}
          data={getChartData(activityGraphStats, isDark)}
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
