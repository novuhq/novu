import { useQuery } from 'react-query';
import styled from '@emotion/styled';
import { useMantineTheme } from '@mantine/core';
import { getActivityStats } from '../../../api/activity';
import { formatNumber } from '../../../utils';
import { colors } from '../../../design-system';

export function ActivityStatistics() {
  const { data: activityStats, isLoading: loadingActivityStats } = useQuery<{
    yearlySent: number;
    monthlySent: number;
    weeklySent: number;
  }>('activityStats', getActivityStats);
  const isDark = useMantineTheme().colorScheme === 'dark';

  return (
    <>
      {!loadingActivityStats ? (
        <ContentWrapper>
          <StatisticsBox>
            <StyledNumber isColored={false} data-test-id="activity-stats-weekly-sent">
              {formatNumber(activityStats?.weeklySent ? activityStats?.weeklySent : 0, 0)}
            </StyledNumber>
            <StatsLabel isColored={false} isDark={isDark}>
              This week
            </StatsLabel>
          </StatisticsBox>
          <StatisticsBox>
            <StyledNumber isColored>
              {formatNumber(activityStats?.monthlySent ? activityStats?.monthlySent : 0, 0)}
            </StyledNumber>
            <StatsLabel isColored isDark={isDark}>
              This month
            </StatsLabel>
          </StatisticsBox>
          <StatisticsBox>
            <StyledNumber isColored={false}>
              {formatNumber(activityStats?.yearlySent ? activityStats?.yearlySent : 0, 0)}
            </StyledNumber>
            <StatsLabel isColored={false} isDark={isDark}>
              This year
            </StatsLabel>
          </StatisticsBox>
        </ContentWrapper>
      ) : null}
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
