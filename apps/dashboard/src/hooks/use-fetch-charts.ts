import { useQuery } from '@tanstack/react-query';
import { type GetChartsResponse, getCharts, ReportTypeEnum } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
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
      },
    ],
    queryFn: ({ signal }) => {
      if (!currentEnvironment) {
        throw new Error('Environment is required');
      }

      return getCharts({
        environment: currentEnvironment,
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
    enabled: enabled && !!currentEnvironment?._id,
  });

  return {
    charts: chartsQuery.data?.data,
    ...chartsQuery,
  };
}
