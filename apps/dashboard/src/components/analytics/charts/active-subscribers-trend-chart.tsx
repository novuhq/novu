import { useCallback, useId, useMemo } from 'react';
import { Area, ComposedChart, Line, XAxis } from 'recharts';
import { type ActiveSubscribersTrendDataPoint } from '../../../api/activity';

import { ChartConfig, ChartContainer, ChartTooltip } from '../../primitives/chart';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { ActiveSubscribersTooltip } from './active-subscribers-tooltip';
import { generateDummyActiveSubscribersData } from './chart-dummy-data';
import { type ActiveSubscribersChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';
import { FlickeringGrid } from './flickering-grid';

const chartConfig = {
  count: {
    label: 'Active subscribers',
    color: '#818cf8',
  },
} satisfies ChartConfig;

type CustomTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
  visibleTicksCount?: number;
};

function CustomTick({ x, y, payload, index, visibleTicksCount }: CustomTickProps) {
  const isFirst = index === 0;
  const isLast = visibleTicksCount !== undefined && index === visibleTicksCount - 1;
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  if (isFirst) anchor = 'start';
  else if (isLast) anchor = 'end';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor={anchor}
        className="fill-text-soft text-[10px] font-mono opacity-60 transition-opacity duration-200 group-hover/chart:opacity-100"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {payload?.value}
      </text>
    </g>
  );
}

type ActiveSubscribersTrendChartProps = {
  data?: ActiveSubscribersTrendDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

export function ActiveSubscribersTrendChart({ data, isLoading, error }: ActiveSubscribersTrendChartProps) {
  const gradientId = useId().replace(/:/g, '');

  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count: dataPoint.count,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  const hasDataChecker = useCallback(
    createDateBasedHasDataChecker<ActiveSubscribersChartData>((dataPoint: ActiveSubscribersChartData) => {
      return (dataPoint.count || 0) > 0;
    }),
    []
  );

  const renderChart = useCallback(
    (chartDataToRender: ActiveSubscribersChartData[], includeTooltip = true) => {
      const areaClipData = chartDataToRender.map((d) => ({ total: d.count }));
      return (
        <div className="relative w-full -mx-1 group/chart h-full min-h-0 flex flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bottom-6 z-0">
            <FlickeringGrid
              squareSize={2}
              gridGap={1}
              maxOpacity={0.1}
              color="#818cf8"
              areaClip={{
                data: areaClipData,
                margin: { left: 10, right: 10, top: 4, bottom: 0 },
              }}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 bottom-6 z-1 bg-linear-to-b from-transparent to-white"
            aria-hidden
          />
          <div className="pointer-events-none absolute left-0 top-0 bottom-6 w-6 bg-linear-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-6 w-6 bg-linear-to-l from-white to-transparent z-10" />
          <ChartContainer config={chartConfig} className="relative z-10 flex-1 min-h-0 w-full aspect-auto">
            <ComposedChart
              accessibilityLayer
              data={chartDataToRender}
              margin={{ left: 2, right: 2, top: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.12} />
                  <stop offset="40%" stopColor="#818cf8" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={<CustomTick />}
                interval={Math.max(0, Math.floor(chartDataToRender.length / 3) - 1)}
                padding={{ left: 8, right: 8 }}
              />
              {includeTooltip && <ChartTooltip cursor={false} content={<ActiveSubscribersTooltip />} />}
              <Area
                dataKey="count"
                type="monotone"
                fill={`url(#${gradientId})`}
                stroke="none"
                baseValue="dataMin"
                isAnimationActive={false}
              />
              <Line
                dataKey="count"
                name="Active subscribers"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                type="monotone"
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      );
    },
    [gradientId]
  );

  const renderEmptyState = useCallback(
    (dummyData: ActiveSubscribersChartData[]) => {
      return renderChart(dummyData, false);
    },
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Active subscribers"
      data={chartData}
      isLoading={isLoading}
      error={error}
      hasDataChecker={hasDataChecker}
      dummyDataGenerator={generateDummyActiveSubscribersData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.ACTIVE_SUBSCRIBERS_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {renderChart}
    </ChartWrapper>
  );
}
