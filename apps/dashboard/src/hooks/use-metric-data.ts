import { useMemo } from 'react';
import type {
  ActiveSubscribersDataPoint,
  AvgMessagesPerSubscriberDataPoint,
  MessagesDeliveredDataPoint,
  TotalInteractionsDataPoint,
  WorkflowRunsMetricDataPoint,
} from '../api/activity';
import { ReportTypeEnum } from '../api/activity';
import { getCompactFormat } from '../utils/number-formatting';

export type MetricData = {
  value: string;
  description: string;
  percentageChange: number;
  trendDirection: 'up' | 'down' | 'neutral';
};

type PeriodData = {
  currentPeriod: number;
  previousPeriod: number;
};

function formatNumber(num: number): string {
  const { value, suffix } = getCompactFormat(num);

  if (suffix) {
    return `${value.toFixed(1)}${suffix}`;
  }

  return num.toLocaleString();
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;

  return ((current - previous) / previous) * 100;
}

function getTrendDirection(percentageChange: number): 'up' | 'down' | 'neutral' {
  if (percentageChange > 0) return 'up';
  if (percentageChange < 0) return 'down';
  return 'neutral';
}

function processMetricData(
  data: PeriodData | null,
  formatter: (value: number) => string = formatNumber,
  changeFormatter: (value: number) => string = formatNumber
): MetricData {
  if (!data) {
    return {
      value: '0',
      description: 'No data available',
      percentageChange: 0,
      trendDirection: 'neutral',
    };
  }

  const change = data.currentPeriod - data.previousPeriod;
  const absChange = Math.abs(change);
  const formattedChange = changeFormatter(absChange);
  const percentageChange = calculatePercentageChange(data.currentPeriod, data.previousPeriod);
  const trendDirection = getTrendDirection(percentageChange);

  const hasNoData = !data.currentPeriod && !data.previousPeriod;

  return {
    value: formatter(data.currentPeriod),
    description: hasNoData
      ? 'No data available'
      : `${change >= 0 ? '+' : '-'}${formattedChange} compared to prior period`,
    percentageChange: Math.abs(percentageChange),
    trendDirection,
  };
}

export function useMetricData(charts: Record<string, unknown> | undefined) {
  const messagesDeliveredData = useMemo(() => {
    const data = charts?.[ReportTypeEnum.MESSAGES_DELIVERED] as MessagesDeliveredDataPoint;
    return processMetricData(data);
  }, [charts]);

  const activeSubscribersData = useMemo(() => {
    const data = charts?.[ReportTypeEnum.ACTIVE_SUBSCRIBERS] as ActiveSubscribersDataPoint;
    return processMetricData(data);
  }, [charts]);

  const avgMessagesPerSubscriberData = useMemo(() => {
    const data = charts?.[ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER] as AvgMessagesPerSubscriberDataPoint;
    return processMetricData(
      data,
      (value) => value.toFixed(1),
      (value) => value.toFixed(1)
    );
  }, [charts]);

  const workflowRunsMetricData = useMemo(() => {
    const data = charts?.[ReportTypeEnum.WORKFLOW_RUNS_METRIC] as WorkflowRunsMetricDataPoint;
    return processMetricData(data);
  }, [charts]);

  const totalInteractionsData = useMemo(() => {
    const data = charts?.[ReportTypeEnum.TOTAL_INTERACTIONS] as TotalInteractionsDataPoint;
    return processMetricData(data);
  }, [charts]);

  return {
    messagesDeliveredData,
    activeSubscribersData,
    avgMessagesPerSubscriberData,
    workflowRunsMetricData,
    totalInteractionsData,
  };
}
