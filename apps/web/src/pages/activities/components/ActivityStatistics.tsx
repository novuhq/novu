import { useQuery } from 'react-query';
import styled from '@emotion/styled';
import { getActivityStats } from '../../../api/activity';
import { formatNumber } from '../../../utils';

export function ActivityStatistics() {
  const { data: activityStats, isLoading: loadingActivityStats } = useQuery<{
    yearlySent: number;
    monthlySent: number;
    weeklySent: number;
  }>('activityStats', getActivityStats);

  return (
    <>
      {!loadingActivityStats ? (
        <ContentWrapper>
          <StatisticsBox>
            <StyledNumber data-test-id="activity-stats-weekly-sent">
              {formatNumber(activityStats?.weeklySent ? activityStats?.weeklySent : 0, 0)}
            </StyledNumber>
            <StatsLabel>This week</StatsLabel>
          </StatisticsBox>
          <StatisticsBox>
            <StyledNumber>{formatNumber(activityStats?.monthlySent ? activityStats?.monthlySent : 0, 0)}</StyledNumber>
            <StatsLabel>This month</StatsLabel>
          </StatisticsBox>
          <StatisticsBox>
            <StyledNumber>{formatNumber(activityStats?.yearlySent ? activityStats?.yearlySent : 0, 0)}</StyledNumber>
            <StatsLabel>This year</StatsLabel>
          </StatisticsBox>
        </ContentWrapper>
      ) : null}
    </>
  );
}

const StatisticsBox = styled.div`
  padding-right: 30px;
  color: #828299; //colors.B60
`;

const ContentWrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-bottom: 30px;
  padding-left: 30px;
`;

const StyledNumber = styled.div`
  font-size: 26px;
  font-weight: 800;
  line-height: 30px;
  text-align: left;
`;

const StatsLabel = styled.div`
  font-size: 14px;
  line-height: 17px;
`;
