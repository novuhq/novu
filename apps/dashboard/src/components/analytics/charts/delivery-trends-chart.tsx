import { StepTypeEnum } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { type ChartDataPoint } from '../../../api/activity';
import { STEP_TYPE_TO_ICON } from '../../icons/utils';

import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyDeliveryData } from './chart-dummy-data';
import { type DeliveryChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

const SEGMENT_GAP = 2;

const chartConfig = {
  email: { label: 'Email', color: '#818cf8' },
  push: { label: 'Push', color: '#22d3ee' },
  chat: { label: 'Chat', color: '#34d399' },
  sms: { label: 'SMS', color: '#fbbf24' },
  inApp: { label: 'In-App', color: '#fb923c' },
} satisfies ChartConfig;

const STEP_TYPE_BY_KEY: Record<keyof typeof chartConfig, StepTypeEnum> = {
  email: StepTypeEnum.EMAIL,
  push: StepTypeEnum.PUSH,
  chat: StepTypeEnum.CHAT,
  sms: StepTypeEnum.SMS,
  inApp: StepTypeEnum.IN_APP,
};

const CHANNELS = (Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map((key) => ({
  key,
  label: chartConfig[key].label,
  color: chartConfig[key].color,
  icon: STEP_TYPE_TO_ICON[STEP_TYPE_BY_KEY[key]],
}));

type DeliveryTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
};

function DeliveryTick({ x, y, payload, index }: DeliveryTickProps) {
  const anchor = index === 0 ? 'start' : 'middle';

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

type DeliveryTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number;
    color?: string;
    payload?: {
      email?: number;
      push?: number;
      sms?: number;
      inApp?: number;
      chat?: number;
      date?: string;
      timestamp?: string;
    };
  }>;
  label?: string;
};

function DeliveryTooltip(props: DeliveryTooltipProps) {
  const data = props.payload?.[0]?.payload;

  const channels = CHANNELS.map((ch) => ({
    key: ch.key,
    label: ch.label,
    value: Number(data?.[ch.key as keyof typeof data]) || 0,
    color: ch.color,
    icon: ch.icon,
  }));

  return <NovuTooltip active={props.active} label={props.label} rows={channels} showTotal={true} />;
}

type DeliveryTrendsChartProps = {
  data?: ChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

type ChartContentProps = {
  data: DeliveryChartData[];
  includeTooltip?: boolean;
};

const BAR_RADIUS = 2;

type StackedBarSegmentShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  segmentIndex: number;
  totalSegments: number;
};

function StackedBarSegmentShape(props: StackedBarSegmentShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, fill, segmentIndex, totalSegments } = props;

  if (height <= 0) return null;

  let offsetY = 0;
  let segmentHeight = height;
  if (totalSegments > 1) {
    if (segmentIndex === 0) {
      offsetY = SEGMENT_GAP / 2;
      segmentHeight = height - SEGMENT_GAP / 2;
    } else if (segmentIndex === totalSegments - 1) {
      segmentHeight = height - SEGMENT_GAP / 2;
    } else {
      offsetY = SEGMENT_GAP / 2;
      segmentHeight = height - SEGMENT_GAP;
    }
  }

  return (
    <rect
      x={x}
      y={y + offsetY}
      width={width}
      height={Math.max(0, segmentHeight)}
      fill={fill}
      rx={BAR_RADIUS}
      ry={BAR_RADIUS}
    />
  );
}

function createStackedBarShape(segmentIndex: number, totalSegments: number) {
  return (props: Omit<StackedBarSegmentShapeProps, 'segmentIndex' | 'totalSegments'>) => (
    <StackedBarSegmentShape {...props} segmentIndex={segmentIndex} totalSegments={totalSegments} />
  );
}

function ChartContent({ data, includeTooltip = true }: ChartContentProps) {
  const [hiddenChannels] = useState<Set<string>>(new Set());
  const dataLength = data.length;

  // Tick interval based on data length
  const tickInterval = useMemo(() => {
    if (dataLength <= 4) return 0;
    if (dataLength <= 7) return 1;
    if (dataLength <= 14) return 3;
    if (dataLength <= 21) return 4;

    return Math.floor(dataLength / 5);
  }, [dataLength]);

  // Dynamic bar size
  const barSize = useMemo(() => {
    if (dataLength <= 7) return 24;
    if (dataLength <= 14) return 16;
    if (dataLength <= 21) return 12;

    return undefined;
  }, [dataLength]);

  const visibleChannels = CHANNELS.filter((ch) => !hiddenChannels.has(ch.key));

  return (
    <div className="relative w-full group/chart flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ChartContainer config={chartConfig} className="h-full min-h-[100px] w-full aspect-auto">
          <BarChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} barSize={barSize} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={<DeliveryTick />}
              interval={tickInterval}
              padding={{ left: 2, right: 2 }}
            />
            {includeTooltip && <ChartTooltip cursor={{ fill: '#f9fafb' }} content={<DeliveryTooltip />} />}
            {visibleChannels.map((channel, idx) => (
              <Bar
                key={channel.key}
                dataKey={channel.key}
                stackId="a"
                fill={channel.color}
                shape={createStackedBarShape(idx, visibleChannels.length)}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

export function DeliveryTrendsChart({ data, isLoading }: DeliveryTrendsChartProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      email: dataPoint.email,
      push: dataPoint.push,
      sms: dataPoint.sms,
      inApp: dataPoint.inApp,
      chat: dataPoint.chat,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  const hasDataChecker = useCallback(
    createDateBasedHasDataChecker<DeliveryChartData>((dataPoint: DeliveryChartData) => {
      return (
        (dataPoint.email || 0) > 0 ||
        (dataPoint.push || 0) > 0 ||
        (dataPoint.sms || 0) > 0 ||
        (dataPoint.inApp || 0) > 0 ||
        (dataPoint.chat || 0) > 0
      );
    }),
    []
  );

  return (
    <ChartWrapper
      title="Delivery trend"
      data={chartData}
      isLoading={isLoading}
      hasDataChecker={hasDataChecker}
      dummyDataGenerator={generateDummyDeliveryData}
      emptyStateRenderer={(dummyData) => <ChartContent data={dummyData} includeTooltip={false} />}
      infoTooltip={ANALYTICS_TOOLTIPS.DELIVERY_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {(data) => <ChartContent data={data} includeTooltip />}
    </ChartWrapper>
  );
}
