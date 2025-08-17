import { useCallback, useMemo } from 'react';
import { Line, LineChart, XAxis } from 'recharts';
import { type InteractionTrendDataPoint } from '../../../api/activity';

import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { Skeleton } from '../../primitives/skeleton';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyInteractionData } from './chart-dummy-data';
import { type InteractionChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

const chartConfig = {
  messageSeen: {
    label: 'Seen',
    color: '#60a5fa',
  },
  messageRead: {
    label: 'Read',
    color: '#34d399',
  },
  messageSnoozed: {
    label: 'Snoozed',
    color: '#a78bfa',
  },
  messageArchived: {
    label: 'Archived',
    color: '#f97316',
  },
} satisfies ChartConfig;

function InteractionTrendChartSkeleton() {
  return (
    <div className="h-[160px] w-full flex items-end justify-between gap-2 px-2">
      {Array.from({ length: 20 }).map((_, i) => {
        const height = Math.random() * 100 + 20;

        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <Skeleton className="w-full rounded-sm" style={{ height: `${height}px` }} />
          </div>
        );
      })}
    </div>
  );
}

type InteractionTrendChartProps = {
  data?: InteractionTrendDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

export function InteractionTrendChart({ data, isLoading, error }: InteractionTrendChartProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      messageSeen: dataPoint.messageSeen,
      messageRead: dataPoint.messageRead,
      messageSnoozed: dataPoint.messageSnoozed,
      messageArchived: dataPoint.messageArchived,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  const hasDataChecker = useCallback(
    createDateBasedHasDataChecker<InteractionChartData>((dataPoint: InteractionChartData) => {
      return (
        (dataPoint.messageSeen || 0) > 0 ||
        (dataPoint.messageRead || 0) > 0 ||
        (dataPoint.messageSnoozed || 0) > 0 ||
        (dataPoint.messageArchived || 0) > 0
      );
    }),
    []
  );

  const renderChart = useCallback((data: InteractionChartData[], includeTooltip = true) => {
    const firstDate = data[1]?.date || '';
    const lastDate = data[data.length - 1]?.date || '';

    return (
      <ChartContainer config={chartConfig} className="h-[160px] w-full">
        <LineChart accessibilityLayer data={data}>
          <XAxis
            dataKey="date"
            axisLine={{ stroke: '#e5e7eb', strokeDasharray: '3 3', strokeWidth: 1 }}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#99a0ae', textAnchor: 'middle' }}
            ticks={[firstDate, lastDate]}
            domain={['dataMin', 'dataMax']}
          />
          {includeTooltip && <ChartTooltip cursor={false} content={<NovuTooltip showTotal={false} />} />}
          <Line dataKey="messageSeen" name="Seen" stroke="#60a5fa" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="messageRead" name="Read" stroke="#34d399" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="messageSnoozed" name="Snoozed" stroke="#a78bfa" strokeWidth={2} dot={false} type="monotone" />
          <Line
            dataKey="messageArchived"
            name="Archived"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    );
  }, []);

  const renderEmptyState = useCallback(
    (dummyData: InteractionChartData[]) => {
      return renderChart(dummyData, false);
    },
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Interaction trend"
      data={chartData}
      isLoading={isLoading}
      error={error}
      hasDataChecker={hasDataChecker}
      loadingSkeleton={<InteractionTrendChartSkeleton />}
      dummyDataGenerator={generateDummyInteractionData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.INTERACTION_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {renderChart}
    </ChartWrapper>
  );
}
