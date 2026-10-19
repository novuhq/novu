import { useQuery } from '@tanstack/react-query';
import { type GetChartsResponse, getCharts, ReportTypeEnum } from '@/api/activity';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { generateMockAnalyticsData } from '@/utils/analytics-mock-data';
import { QueryKeys } from '@/utils/query-keys';

type UseFetchChartsParams = {
  createdAtGte?: string;
  createdAtLte?: string;
  reportType?: ReportTypeEnum[];
  workflowIds?: string[];
  subscriberIds?: string[];
  transactionIds?: string[];
  statuses?: string[];
  channels?: string[];
  topicKey?: string;
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  useMockData?: boolean;
};

export function useFetchCharts({
  createdAtGte,
  createdAtLte,
  reportType = [ReportTypeEnum.DELIVERY_TREND],
  workflowIds,
  subscriberIds,
  transactionIds,
  statuses,
  channels,
  topicKey,
  enabled = true,
  refetchInterval = false,
  refetchOnWindowFocus = false,
  staleTime = 5 * 60 * 1000, // 5 minutes
  useMockData = false,
}: UseFetchChartsParams = {}) {
  const { currentEnvironment } = useEnvironment();

  const chartsQuery = useQuery<GetChartsResponse>({
    queryKey: [
      QueryKeys.fetchCharts,
      currentEnvironment?._id,
      {
        createdAtGte,
        createdAtLte,
        reportType,
        workflowIds,
        subscriberIds,
        transactionIds,
        statuses,
        channels,
        topicKey,
        useMockData,
      },
    ],
    queryFn: ({ signal }) => {
      if (useMockData) {
        return Promise.resolve(generateMockAnalyticsData());
      }

      const environment = requireEnvironment(currentEnvironment, 'Environment is required');

      return getCharts({
        environment,
        createdAtGte,
        createdAtLte,
        reportType,
        workflowIds,
        subscriberIds,
        transactionIds,
        statuses,
        channels,
        topicKey,
        signal,
      });
    },
    staleTime,
    refetchOnWindowFocus,
    refetchInterval,
    enabled: enabled && (useMockData || !!currentEnvironment?._id),
  });

  return {
    charts: chartsQuery.data?.data,
    ...chartsQuery,
  };
}
