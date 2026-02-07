import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { Line, LineChart, XAxis } from 'recharts';
import { type WorkflowRunsTrendDataPoint } from '../../../api/activity';
import { useFeatureFlag } from '../../../hooks/use-feature-flag';

import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { Skeleton } from '../../primitives/skeleton';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyWorkflowRunsData } from './chart-dummy-data';
import { type WorkflowRunsChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

const legacyChartConfig = {
  success: {
    label: 'Success',
    color: '#34d399',
  },
  pending: {
    label: 'Pending',
    color: '#facc15',
  },
  error: {
    label: 'Error',
    color: '#ef4444',
  },
} satisfies ChartConfig;

const finalStatusChartConfig = {
  success: {
    label: 'Success',
    color: '#34d399',
  },
  error: {
    label: 'Error',
    color: '#ef4444',
  },
} satisfies ChartConfig;

function WorkflowRunsTrendChartSkeleton() {
  return (
    <div className="h-[160px] w-full relative px-4">
      <div className="absolute inset-0 flex items-end justify-between px-2">
        {Array.from({ length: 35 }).map((_, i) => {
          const baseHeight = 40;
          const successHeight = baseHeight + Math.sin(i * 0.3) * 30 + Math.random() * 20;

          return (
            <div key={i} className="flex flex-col items-center flex-1 relative">
              <div className="relative w-full flex justify-center">
                <Skeleton
                  className="rounded-sm"
                  style={{
                    height: `${Math.max(successHeight, 20)}px`,
                    width: '15px',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-6 left-4 right-4 h-px">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

type WorkflowRunsTrendChartProps = {
  data?: WorkflowRunsTrendDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

function LegacyWorkflowRunsTrendChart({ data, isLoading, error }: WorkflowRunsTrendChartProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      completed: dataPoint.completed,
      processing: dataPoint.processing,
      error: dataPoint.error,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  const hasDataChecker = useCallback(
    createDateBasedHasDataChecker<WorkflowRunsChartData>(
      (dataPoint: WorkflowRunsChartData) =>
        (dataPoint.completed || 0) > 0 || (dataPoint.processing || 0) > 0 || (dataPoint.error || 0) > 0
    ),
    []
  );

  const renderChart = useCallback((chartDataToRender: WorkflowRunsChartData[], includeTooltip = true) => {
    return (
      <ChartContainer config={legacyChartConfig} className="h-[160px] w-full">
        <LineChart accessibilityLayer data={chartDataToRender}>
          <XAxis
            dataKey="date"
            axisLine={{ stroke: '#e5e7eb', strokeDasharray: '3 3', strokeWidth: 1 }}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#99a0ae', textAnchor: 'middle' }}
            tickFormatter={(value, index) => {
              if (index % 2 === 0) return value;

              return '';
            }}
            domain={['dataMin', 'dataMax']}
          />
          {includeTooltip && <ChartTooltip cursor={false} content={<NovuTooltip showTotal={false} />} />}
          <Line dataKey="completed" name="Completed" stroke="#34d399" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="processing" name="Processing" stroke="#facc15" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="error" name="Error" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
        </LineChart>
      </ChartContainer>
    );
  }, []);

  const renderEmptyState = useCallback(
    (dummyData: WorkflowRunsChartData[]) => renderChart(dummyData, false),
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Workflow runs"
      data={chartData}
      isLoading={isLoading}
      error={error}
      hasDataChecker={hasDataChecker}
      loadingSkeleton={<WorkflowRunsTrendChartSkeleton />}
      dummyDataGenerator={generateDummyWorkflowRunsData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.WORKFLOW_RUNS_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {renderChart}
    </ChartWrapper>
  );
}

function FinalStatusWorkflowRunsTrendChart({ data, isLoading, error }: WorkflowRunsTrendChartProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      completed: dataPoint.completed,
      error: dataPoint.error,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  const hasDataChecker = useCallback(
    createDateBasedHasDataChecker<WorkflowRunsChartData>(
      (dataPoint: WorkflowRunsChartData) => (dataPoint.completed || 0) > 0 || (dataPoint.error || 0) > 0
    ),
    []
  );

  const renderChart = useCallback((chartDataToRender: WorkflowRunsChartData[], includeTooltip = true) => {
    return (
      <ChartContainer config={finalStatusChartConfig} className="h-[160px] w-full">
        <LineChart accessibilityLayer data={chartDataToRender}>
          <XAxis
            dataKey="date"
            axisLine={{ stroke: '#e5e7eb', strokeDasharray: '3 3', strokeWidth: 1 }}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#99a0ae', textAnchor: 'middle' }}
            tickFormatter={(value, index) => {
              if (index % 2 === 0) return value;

              return '';
            }}
            domain={['dataMin', 'dataMax']}
          />
          {includeTooltip && <ChartTooltip cursor={false} content={<NovuTooltip showTotal={false} />} />}
          <Line dataKey="completed" name="Completed" stroke="#34d399" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="error" name="Error" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
        </LineChart>
      </ChartContainer>
    );
  }, []);

  const renderEmptyState = useCallback(
    (dummyData: WorkflowRunsChartData[]) => renderChart(dummyData, false),
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Workflow runs"
      data={chartData}
      isLoading={isLoading}
      error={error}
      hasDataChecker={hasDataChecker}
      loadingSkeleton={<WorkflowRunsTrendChartSkeleton />}
      dummyDataGenerator={generateDummyWorkflowRunsData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.WORKFLOW_RUNS_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {renderChart}
    </ChartWrapper>
  );
}

export function WorkflowRunsTrendChart(props: WorkflowRunsTrendChartProps) {
  const isFinalStatusOnly = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TREND_FROM_TRACES_ENABLED);

  if (isFinalStatusOnly) {
    return <FinalStatusWorkflowRunsTrendChart {...props} />;
  }

  return <LegacyWorkflowRunsTrendChart {...props} />;
}
