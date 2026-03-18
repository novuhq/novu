import { Fragment, useCallback, useId, useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis } from 'recharts';
import { type InteractionTrendDataPoint } from '../../../api/activity';

import { ChartConfig, ChartContainer, ChartTooltip } from '../../primitives/chart';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyInteractionData } from './chart-dummy-data';
import { type InteractionChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';

const chartConfig = {
  messageSeen: { label: 'Seen', color: '#818cf8' },
  messageRead: { label: 'Read', color: '#34d399' },
  messageSnoozed: { label: 'Snoozed', color: '#f472b6' },
  messageArchived: { label: 'Archived', color: '#fb923c' },
} satisfies ChartConfig;

const FUNNEL = (['messageSeen', 'messageRead', 'messageSnoozed', 'messageArchived'] as const).map((key) => ({
  key,
  label: chartConfig[key].label,
  color: chartConfig[key].color,
}));

type InteractionTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number;
    color?: string;
    payload?: InteractionChartData;
  }>;
  label?: string;
};

function InteractionTrendTooltip({ active, payload, label }: InteractionTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as InteractionChartData | undefined;
  if (!data) return null;

  const seen = Number(data.messageSeen) || 0;
  const total =
    seen + (Number(data.messageRead) || 0) + (Number(data.messageSnoozed) || 0) + (Number(data.messageArchived) || 0);

  const rows = FUNNEL.map(({ key, label: rowLabel, color }) => {
    const value = Number(data[key as keyof InteractionChartData]) || 0;
    const pctOfSeen = key !== 'messageSeen' && seen > 0 ? Math.round((value / seen) * 100) : null;

    return { key, label: rowLabel, value, color, pctOfSeen };
  });

  return (
    <div className="min-w-[248px] overflow-hidden rounded-xl border border-border/40 bg-bg-white text-[12px] shadow-popover">
      <div className="bg-bg-weak px-3 py-2">
        <p className="truncate font-medium tracking-tight text-text-soft">{label}</p>
      </div>
      <div className="border-t border-border/30" />
      <div className="grid gap-x-1 gap-y-1 px-3 py-2" style={{ gridTemplateColumns: '1fr 96px 46px' }}>
        {rows.map((row) => (
          <Fragment key={row.key}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-2 w-1 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <p className="min-w-0 truncate font-medium capitalize text-text-sub">{row.label}</p>
            </div>
            <div className="flex min-w-0 items-center justify-end overflow-hidden">
              {row.pctOfSeen !== null ? (
                <span className="truncate text-[10px] tabular-nums text-text-soft whitespace-nowrap">
                  ({row.pctOfSeen}% of seen)
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-end">
              <span className="font-mono text-[11px] tabular-nums font-medium text-text-strong">
                {row.value.toLocaleString()}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
      <div className="border-t border-border/30" />
      <div
        className="grid items-center gap-x-4 gap-y-1 bg-bg-weak px-3 py-2"
        style={{ gridTemplateColumns: '1fr 96px 56px' }}
      >
        <p className="font-semibold text-text-sub">Total</p>
        <div />
        <div className="flex justify-end">
          <span className="font-mono text-[11px] tabular-nums font-semibold text-text-strong">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

type CustomTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
};

function CustomTick({ x, y, payload, index }: CustomTickProps) {
  const anchor = index === 0 ? 'start' : 'end';

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

type InteractionTrendChartProps = {
  data?: InteractionTrendDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

type InteractionTrendChartContentProps = {
  data: InteractionChartData[];
  includeTooltip: boolean;
};

function InteractionTrendChartContent({ data, includeTooltip }: InteractionTrendChartContentProps) {
  const baseId = useId();
  const gradientSeenId = `${baseId}-gradientSeen`;
  const gradientReadId = `${baseId}-gradientRead`;
  const gradientSnoozedId = `${baseId}-gradientSnoozed`;
  const gradientArchivedId = `${baseId}-gradientArchived`;

  const colors = {
    seen: { stroke: chartConfig.messageSeen.color, fill: `url(#${gradientSeenId})` },
    read: { stroke: chartConfig.messageRead.color, fill: `url(#${gradientReadId})` },
    snoozed: { stroke: chartConfig.messageSnoozed.color, fill: `url(#${gradientSnoozedId})` },
    archived: { stroke: chartConfig.messageArchived.color, fill: `url(#${gradientArchivedId})` },
  };

  // Use second point as first tick so the axis excludes the leading/padding point at data[0]
  const firstDate = data[1]?.date || '';
  const lastDate = data[data.length - 1]?.date || '';

  return (
    <div className="relative w-full -mx-1 group/chart h-[160px]">
      <div className="pointer-events-none absolute left-0 top-0 bottom-6 w-3 bg-linear-to-r from-white via-white/80 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-6 w-3 bg-linear-to-l from-white via-white/80 to-transparent z-10" />
      <ChartContainer config={chartConfig} className="h-full min-h-[100px] w-full aspect-auto">
        <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientSeenId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id={gradientReadId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id={gradientSnoozedId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#f472b6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id={gradientArchivedId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#fb923c" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={<CustomTick />}
            ticks={[firstDate, lastDate]}
            domain={['dataMin', 'dataMax']}
            padding={{ left: 4, right: 0 }}
          />
          <YAxis hide domain={[0, 'auto']} />
          {includeTooltip && <ChartTooltip cursor={false} content={<InteractionTrendTooltip />} />}
          <Area
            dataKey="messageArchived"
            name="Archived"
            type="monotone"
            stackId="interactions"
            stroke={colors.archived.stroke}
            strokeWidth={1.5}
            fill={colors.archived.fill}
          />
          <Area
            dataKey="messageSnoozed"
            name="Snoozed"
            type="monotone"
            stackId="interactions"
            stroke={colors.snoozed.stroke}
            strokeWidth={1.5}
            fill={colors.snoozed.fill}
          />
          <Area
            dataKey="messageRead"
            name="Read"
            type="monotone"
            stackId="interactions"
            stroke={colors.read.stroke}
            strokeWidth={1.5}
            fill={colors.read.fill}
          />
          <Area
            dataKey="messageSeen"
            name="Seen"
            type="monotone"
            stackId="interactions"
            stroke={colors.seen.stroke}
            strokeWidth={1.5}
            fill={colors.seen.fill}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

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

  return (
    <ChartWrapper
      title="Interaction trend"
      data={chartData}
      isLoading={isLoading}
      error={error}
      hasDataChecker={hasDataChecker}
      dummyDataGenerator={generateDummyInteractionData}
      emptyStateRenderer={(dummyData) => <InteractionTrendChartContent data={dummyData} includeTooltip={false} />}
      infoTooltip={ANALYTICS_TOOLTIPS.INTERACTION_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
    >
      {(data) => <InteractionTrendChartContent data={data} includeTooltip />}
    </ChartWrapper>
  );
}
