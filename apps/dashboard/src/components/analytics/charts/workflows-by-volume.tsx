import { useCallback, useMemo } from 'react';
import { RiRouteFill } from 'react-icons/ri';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import { type WorkflowVolumeDataPoint } from '../../../api/activity';

import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { Skeleton } from '../../primitives/skeleton';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createVolumeBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyWorkflowData } from './chart-dummy-data';
import { type WorkflowChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

// Color palette for workflow charts
const colorPalette = ['#8b5cf6', '#06b6d4', '#facc15', '#f97316', '#ef4444'];

const chartConfig = {
  count: {
    label: 'Workflow runs',
    color: '#8b5cf6',
  },
} satisfies ChartConfig;

type WorkflowVolumeTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number;
    color?: string;
    payload?: {
      workflowName?: string;
      count?: number;
      displayName?: string;
      fill?: string;
    };
  }>;
  label?: string;
};

function WorkflowVolumeTooltip(props: WorkflowVolumeTooltipProps) {
  const data = props.payload?.[0]?.payload;

  if (!data) return null;

  const rows = [
    {
      key: 'count',
      label: 'Workflow runs',
      value: data.count || 0,
      color: data.fill || '#8b5cf6',
    },
  ];

  return (
    <NovuTooltip active={props.active} label={data.displayName || data.workflowName} rows={rows} showTotal={false} />
  );
}

function WorkflowsByVolumeSkeleton() {
  return (
    <div className="h-[160px] w-full flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => {
        const width = Math.random() * 60 + 20; // Random width between 20-80%
        return (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-20 flex-shrink-0 rounded-sm" />
            <Skeleton className="h-4 flex-grow rounded-sm" style={{ width: `${width}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function CustomTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const maxLength = 20;
  const text = payload.value.length > maxLength ? `${payload.value.slice(0, maxLength)}...` : payload.value;

  return (
    <g transform={`translate(${x},${y})`}>
      <RiRouteFill x={-16} y={-6} width={12} height={12} fill="#525866" />
      <text x={-2} y={0} dy={4} textAnchor="start" fill="#525866" fontSize={12}>
        {text}
      </text>
    </g>
  );
}

type WorkflowsByVolumeProps = {
  data?: WorkflowVolumeDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

export function WorkflowsByVolume({ data, isLoading }: WorkflowsByVolumeProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint, index) => ({
      workflowName: dataPoint.workflowName,
      count: dataPoint.count,
      displayName:
        dataPoint.workflowName.length > 20
          ? `${dataPoint.workflowName.substring(0, 20)}...`.replace(/\b\w/g, (char: string) => char.toUpperCase())
          : dataPoint.workflowName.replace(/\b\w/g, (char: string) => char.toUpperCase()),
      fill: colorPalette[index % colorPalette.length],
    }));
  }, [data]);

  const hasDataChecker = useCallback(
    createVolumeBasedHasDataChecker<WorkflowChartData>((dataPoint: WorkflowChartData) => {
      return (dataPoint.count || 0) > 0;
    }),
    []
  );

  const calculateChartHeight = useCallback((data: WorkflowChartData[]) => {
    const itemCount = data.length;
    const barHeight = 16;
    const gap = 10;
    return Math.max(itemCount * (barHeight + gap) + 20, 80);
  }, []);

  const renderChart = useCallback(
    (data: WorkflowChartData[], includeTooltip = true) => {
      const chartHeight = calculateChartHeight(data);

      return (
        <ChartContainer config={chartConfig} className="w-full" style={{ height: `${chartHeight}px` }}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            height={chartHeight}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <XAxis type="number" dataKey="count" hide />
            <YAxis
              dataKey="displayName"
              type="category"
              tickLine={false}
              tickMargin={168}
              axisLine={false}
              width={190}
              tick={CustomTick}
              interval={0}
            />
            {includeTooltip && <ChartTooltip cursor={false} content={<WorkflowVolumeTooltip />} />}
            <Bar dataKey="count" radius={6} barSize={16}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      );
    },
    [calculateChartHeight]
  );

  const renderEmptyState = useCallback(
    (dummyData: WorkflowChartData[]) => {
      return renderChart(dummyData, false);
    },
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Top workflows by volume"
      data={chartData}
      isLoading={isLoading}
      hasDataChecker={hasDataChecker}
      loadingSkeleton={<WorkflowsByVolumeSkeleton />}
      dummyDataGenerator={generateDummyWorkflowData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.TOP_WORKFLOWS_BY_VOLUME}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_ENTRIES}
    >
      {renderChart}
    </ChartWrapper>
  );
}
