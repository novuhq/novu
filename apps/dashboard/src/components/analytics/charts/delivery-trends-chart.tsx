import { StepTypeEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { Bar, BarChart, XAxis } from 'recharts';
import { type ChartDataPoint } from '../../../api/activity';
import { STEP_TYPE_TO_ICON } from '../../icons/utils';

import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { Skeleton } from '../../primitives/skeleton';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyDeliveryData } from './chart-dummy-data';
import { type DeliveryChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

const chartConfig = {
  email: {
    label: 'Email',
    color: '#8b5cf6',
  },
  push: {
    label: 'Push',
    color: '#06b6d4',
  },
  chat: {
    label: 'Chat',
    color: '#10b981',
  },
  sms: {
    label: 'SMS',
    color: '#facc15',
  },
  inApp: {
    label: 'In-App',
    color: '#f97316',
  },
} satisfies ChartConfig;

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

  const channels = [
    {
      key: 'email',
      label: 'Email',
      value: data?.email || 0,
      color: '#8b5cf6',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL],
    },
    {
      key: 'push',
      label: 'Push',
      value: data?.push || 0,
      color: '#06b6d4',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.PUSH],
    },
    {
      key: 'chat',
      label: 'Chat',
      value: data?.chat || 0,
      color: '#10b981',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.CHAT],
    },
    {
      key: 'sms',
      label: 'SMS',
      value: data?.sms || 0,
      color: '#facc15',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.SMS],
    },
    {
      key: 'inApp',
      label: 'In-app (Inbox)',
      value: data?.inApp || 0,
      color: '#f97316',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP],
    },
  ];

  return <NovuTooltip active={props.active} label={props.label} rows={channels} showTotal={true} />;
}

function DeliveryTrendsChartSkeleton() {
  return (
    <div className="h-[160px] w-full flex items-end justify-between gap-1 px-2">
      {Array.from({ length: 12 }).map((_, i) => {
        const totalHeight = Math.random() * 80 + 40;
        const segments = [
          { height: totalHeight * 0.4 },
          { height: totalHeight * 0.25 },
          { height: totalHeight * 0.2 },
          { height: totalHeight * 0.15 },
        ];

        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full max-w-[20px] flex flex-col rounded-sm overflow-hidden border-2 border-white">
              {segments.map((segment, segmentIndex) => (
                <Skeleton key={segmentIndex} className="w-full rounded-sm" style={{ height: `${segment.height}px` }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type DeliveryTrendsChartProps = {
  data?: ChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

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

  const renderChart = useCallback((data: DeliveryChartData[], includeTooltip = true) => {
    const firstDate = data[1]?.date || '';
    const lastDate = data[data.length - 1]?.date || '';

    return (
      <ChartContainer config={chartConfig} className="h-[160px] w-full">
        <BarChart accessibilityLayer data={data} barCategoryGap={5}>
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#99a0ae' }}
            ticks={[firstDate, lastDate]}
          />
          {includeTooltip && <ChartTooltip cursor={false} content={<DeliveryTooltip />} />}
          <Bar
            dataKey="email"
            stackId="a"
            barSize={20}
            fill="#8b5cf6"
            radius={[3, 3, 6, 6]}
            stroke="#ffffff"
            strokeWidth={2}
          />
          <Bar dataKey="push" stackId="a" barSize={20} fill="#06b6d4" radius={3} stroke="#ffffff" strokeWidth={2} />
          <Bar dataKey="chat" stackId="a" barSize={20} fill="#10b981" radius={3} stroke="#ffffff" strokeWidth={2} />
          <Bar dataKey="sms" stackId="a" barSize={20} fill="#facc15" radius={3} stroke="#ffffff" strokeWidth={2} />
          <Bar
            dataKey="inApp"
            stackId="a"
            barSize={20}
            fill="#f97316"
            radius={[6, 6, 3, 3]}
            stroke="#ffffff"
            strokeWidth={2}
          />
        </BarChart>
      </ChartContainer>
    );
  }, []);

  const renderEmptyState = useCallback(
    (dummyData: DeliveryChartData[]) => {
      return renderChart(dummyData, false);
    },
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Delivery trend"
      data={chartData}
      isLoading={isLoading}
      hasDataChecker={hasDataChecker}
      loadingSkeleton={<DeliveryTrendsChartSkeleton />}
      dummyDataGenerator={generateDummyDeliveryData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.DELIVERY_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {renderChart}
    </ChartWrapper>
  );
}
