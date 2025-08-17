import { useCallback, useMemo } from 'react';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import { type ProviderVolumeDataPoint } from '../../../api/activity';
import { ProviderIcon } from '../../integrations/components/provider-icon';

import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { Skeleton } from '../../primitives/skeleton';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createVolumeBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyProviderData } from './chart-dummy-data';
import { type ProviderChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

// Color palette for provider charts
const colorPalette = ['#8b5cf6', '#06b6d4', '#facc15', '#f97316', '#ef4444'];

const chartConfig = {
  count: {
    label: 'Messages sent',
    color: '#8b5cf6',
  },
} satisfies ChartConfig;

type ProviderVolumeTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number;
    color?: string;
    payload?: {
      providerId?: string;
      count?: number;
      displayName?: string;
      fill?: string;
    };
  }>;
  label?: string;
};

function ProviderVolumeTooltip(props: ProviderVolumeTooltipProps) {
  const data = props.payload?.[0]?.payload;

  if (!data) return null;

  const rows = [
    {
      key: 'count',
      label: 'Messages sent',
      value: data.count || 0,
      color: data.fill || '#8b5cf6',
    },
  ];

  return (
    <NovuTooltip active={props.active} label={data.displayName || data.providerId} rows={rows} showTotal={false} />
  );
}

function ProvidersByVolumeSkeleton() {
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
  const formatProviderName = (name: string) => {
    return name.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
  };

  const formattedText = payload.value === 'novu' ? 'Novu Inbox' : formatProviderName(payload.value);
  const text = formattedText.length > maxLength ? `${formattedText.slice(0, maxLength)}...` : formattedText;

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-16} y={-8} width={16} height={16}>
        <ProviderIcon providerId={payload.value} providerDisplayName={text} className="h-4 w-4" />
      </foreignObject>
      <text x={6} y={0} dy={4} textAnchor="start" fill="#525866" fontSize={12}>
        {text}
      </text>
    </g>
  );
}

type ProvidersByVolumeProps = {
  data?: ProviderVolumeDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

export function ProvidersByVolume({ data, isLoading }: ProvidersByVolumeProps) {
  const formatProviderName = useCallback((name: string) => {
    return name.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
  }, []);

  const chartData = useMemo(() => {
    return data?.map((dataPoint, index) => {
      const formattedName = dataPoint.providerId === 'novu' ? 'Novu Inbox' : formatProviderName(dataPoint.providerId);
      return {
        providerId: dataPoint.providerId,
        count: dataPoint.count,
        displayName: formattedName.length > 20 ? `${formattedName.substring(0, 20)}...` : formattedName,
        fill: colorPalette[index % colorPalette.length],
      };
    });
  }, [data, formatProviderName]);

  const hasDataChecker = useCallback(
    createVolumeBasedHasDataChecker<ProviderChartData>((dataPoint: ProviderChartData) => {
      return (dataPoint.count || 0) > 0;
    }),
    []
  );

  const calculateChartHeight = useCallback((data: ProviderChartData[]) => {
    const itemCount = data.length;
    const barHeight = 16;
    const gap = 10;
    return Math.max(itemCount * (barHeight + gap) + 20, 80);
  }, []);

  const renderChart = useCallback(
    (data: ProviderChartData[], includeTooltip = true) => {
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
              dataKey="providerId"
              type="category"
              tickLine={false}
              tickMargin={168}
              axisLine={false}
              width={190}
              tick={CustomTick}
              interval={0}
            />
            {includeTooltip && <ChartTooltip cursor={false} content={<ProviderVolumeTooltip />} />}
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
    (dummyData: ProviderChartData[]) => {
      return renderChart(dummyData, false);
    },
    [renderChart]
  );

  return (
    <ChartWrapper
      title="Top providers by volume"
      data={chartData}
      isLoading={isLoading}
      hasDataChecker={hasDataChecker}
      loadingSkeleton={<ProvidersByVolumeSkeleton />}
      dummyDataGenerator={generateDummyProviderData}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.PROVIDERS_BY_VOLUME}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_ENTRIES}
    >
      {renderChart}
    </ChartWrapper>
  );
}
