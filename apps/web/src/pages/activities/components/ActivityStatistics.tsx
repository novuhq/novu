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
              {formatNumber(activityStats?.weeklySent, 0)}
            </StyledNumber>
            <StyledText>This week</StyledText>
          </StatisticsBox>
          <StatisticsBox>
            <StyledNumber>{formatNumber(activityStats?.monthlySent, 0)}</StyledNumber>
            <StyledText>This month</StyledText>
          </StatisticsBox>
          <StatisticsBox>
            <StyledNumber>{formatNumber(activityStats?.yearlySent, 0)}</StyledNumber>
            <StyledText>This year</StyledText>
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
  font-style: normal;
  font-weight: 800;
  line-height: 30px;
  letter-spacing: 0;
  text-align: left;
`;
const StyledText = styled.div`
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: 17px;
  letter-spacing: 0;
  text-align: left;
`;
