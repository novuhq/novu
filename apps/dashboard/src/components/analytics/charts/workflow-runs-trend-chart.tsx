import { useCallback, useMemo } from 'react';
import { Line, LineChart, XAxis } from 'recharts';
import { type WorkflowRunsTrendDataPoint } from '../../../api/activity';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { Skeleton } from '../../primitives/skeleton';
import { generateDummyWorkflowRunsData } from './chart-dummy-data';
import { type WorkflowRunsChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

const chartConfig = {
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

function WorkflowRunsTrendChartSkeleton() {
  return (
    <Card className="shadow-box-xs border-none">
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub">
          <Skeleton className="h-4 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="h-[160px] w-full relative">
          {/* Simulate line chart curves */}
          <svg className="w-full h-full">
            {/* Success line */}
            <path
              d="M20,120 Q60,80 100,90 T180,70 T260,85 T340,65"
              stroke="#34d399"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
            {/* Pending line */}
            <path
              d="M20,100 Q60,110 100,95 T180,105 T260,90 T340,100"
              stroke="#facc15"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
            {/* Error line */}
            <path
              d="M20,130 Q60,125 100,135 T180,120 T260,125 T340,115"
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
          </svg>
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-5">
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-2 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type WorkflowRunsTrendChartProps = {
  data?: WorkflowRunsTrendDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

export function WorkflowRunsTrendChart({ data, isLoading, error }: WorkflowRunsTrendChartProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      success: dataPoint.success,
      pending: dataPoint.pending,
      error: dataPoint.error,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  const hasDataChecker = useCallback((data: WorkflowRunsChartData[]) => {
    return data.some(
      (dataPoint) => (dataPoint.success || 0) > 0 || (dataPoint.pending || 0) > 0 || (dataPoint.error || 0) > 0
    );
  }, []);

  const renderChart = useCallback((data: WorkflowRunsChartData[], includeTooltip = true) => {
    return (
      <ChartContainer config={chartConfig} className="h-[160px] w-full">
        <LineChart accessibilityLayer data={data}>
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
          <Line dataKey="success" name="Completed" stroke="#34d399" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="pending" name="Pending" stroke="#facc15" strokeWidth={2} dot={false} type="monotone" />
          <Line dataKey="error" name="Error" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
        </LineChart>
      </ChartContainer>
    );
  }, []);

  const renderEmptyState = useCallback(
    (dummyData: WorkflowRunsChartData[]) => {
      return renderChart(dummyData, false);
    },
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
    >
      {renderChart}
    </ChartWrapper>
  );
}
