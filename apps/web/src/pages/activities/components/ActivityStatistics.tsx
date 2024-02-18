import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { Skeleton, useMantineTheme } from '@mantine/core';

import { getActivityStats } from '../../../api/activity';
import { formatNumber } from '../../../utils';
import { colors } from '@novu/design-system';

export function ActivityStatistics() {
  const { data: activityStats } = useQuery<{
    monthlySent: number;
    weeklySent: number;
  }>(['activityStats'], getActivityStats);
  const isDark = useMantineTheme().colorScheme === 'dark';
  const weekCount = typeof activityStats?.weeklySent == 'number' ? formatNumber(activityStats.weeklySent, 0) : null;
  const monthCount = typeof activityStats?.monthlySent == 'number' ? formatNumber(activityStats.monthlySent, 0) : null;

  return (
    <>
      <ContentWrapper>
        <StatisticsBox>
          <StyledNumber isColored={false} data-test-id="activity-stats-weekly-sent">
            <StyledNumber isColored={false}>
              {weekCount ? weekCount : <Skeleton height={30} width="40%" />}
            </StyledNumber>
          </StyledNumber>
          <StatsLabel isColored={false} isDark={isDark}>
            This week
          </StatsLabel>
        </StatisticsBox>
        <StatisticsBox>
          <StyledNumber isColored={false}>
            {monthCount ? monthCount : <Skeleton height={30} width="50%" />}
          </StyledNumber>
          <StatsLabel isColored isDark={isDark}>
            This month
          </StatsLabel>
        </StatisticsBox>
      </ContentWrapper>
    </>
  );
}

const StatisticsBox = styled.div`
  padding-right: 30px;
`;

const ContentWrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-bottom: 30px;
  padding-left: 30px;
`;

const StyledNumber = styled.div<{ isColored: boolean }>`
  font-size: 26px;
  font-weight: 900;
  line-height: 30px;
  text-align: left;
  margin-bottom: 2px;
  background: ${({ isColored }: { isColored: boolean }) =>
    isColored ? '-webkit-linear-gradient(90deg, #dd2476 0%, #ff512f 100%)' : colors.B60};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const StatsLabel = styled.div<{ isColored: boolean; isDark: boolean }>`
  font-size: 14px;
  line-height: 17px;
  font-weight: 700;
  color: ${({ isColored, isDark }) => {
    const notColoredThemeTextColor = isDark ? colors.white : colors.B40;

    return !isColored ? colors.B60 : notColoredThemeTextColor;
  }};
`;
