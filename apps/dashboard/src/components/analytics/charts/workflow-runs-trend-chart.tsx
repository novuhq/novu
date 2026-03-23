import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ArrowRight } from 'lucide-react';
import { useCallback, useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, ComposedChart, XAxis, YAxis } from 'recharts';
import { type WorkflowRunsTrendDataPoint } from '../../../api/activity';
import { useFeatureFlag } from '../../../hooks/use-feature-flag';
import { ROUTES } from '../../../utils/routes';
import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '../../primitives/chart';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';
import { createDateBasedHasDataChecker } from '../utils/chart-validation';
import { generateDummyWorkflowRunsData } from './chart-dummy-data';
import { type WorkflowRunsChartData } from './chart-types';
import { ChartWrapper } from './chart-wrapper';
import { FlickeringGrid } from './flickering-grid';

type WorkflowRunsChartDataWithTotal = WorkflowRunsChartData & { total: number };

const CHART_HEIGHT = 180;
const WORKFLOW_RUNS_GRID_CLIP_MARGIN = { left: 2, right: 2, top: 4, bottom: 0 } as const;
const FLICKERING_GRID_PROPS = {
  squareSize: 2,
  gridGap: 1,
  maxOpacity: 0.1,
  color: '#34d399',
} as const;

const LEGACY_CHART_CONFIG = {
  completed: { label: 'Success', color: '#34d399' },
  processing: { label: 'Pending', color: '#fbbf24' },
  error: { label: 'Error', color: '#fb923c' },
} satisfies ChartConfig;

const FINAL_STATUS_CHART_CONFIG = {
  completed: { label: 'Success', color: '#34d399' },
  error: { label: 'Error', color: '#fb923c' },
} satisfies ChartConfig;

const LEGACY_SERIES_KEYS = ['completed', 'processing', 'error'] as const;
const FINAL_STATUS_SERIES_KEYS = ['completed', 'error'] as const;

const GRADIENT_STOPS: Record<string, [number, number, number]> = {
  completed: [0.22, 0.04, 0],
  processing: [0.12, 0.04, 0],
  error: [0.12, 0.04, 0],
};

type CustomTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
};

function CustomTick({ x, y, payload, index }: CustomTickProps) {
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

function BillingNudge() {
  return (
    <Link
      to={ROUTES.SETTINGS_BILLING}
      className="flex items-center gap-1.5 py-2 px-3 -mx-3 -mb-3 mt-2 rounded-b-lg bg-linear-to-r from-neutral-alpha-50 via-neutral-alpha-25 to-transparent text-[12px] text-text-sub hover:text-text-strong transition-colors cursor-pointer"
    >
      <span className="text-text-sub font-medium">Track usage against your plan limits</span>
      <span className="font-medium text-text-sub inline-flex items-center gap-1">
        View billing
        <ArrowRight className="size-3.5 shrink-0" />
      </span>
    </Link>
  );
}

type WorkflowRunsTrendChartProps = {
  data?: WorkflowRunsTrendDataPoint[];
  count?: number;
  periodLabel?: string;
  isLoading?: boolean;
  error?: Error | null;
};

type ChartContentParams = {
  data: WorkflowRunsChartDataWithTotal[];
  includeTooltip: boolean;
  config: ChartConfig;
  seriesKeys: readonly string[];
  baseId: string;
};

function renderWorkflowRunsChartContent({ data, includeTooltip, config, seriesKeys, baseId }: ChartContentParams) {
  return (
    <div className="relative w-full -mx-1 group/chart h-full flex flex-col">
      <div className={`pointer-events-none absolute left-0 right-0 top-0 z-0`} style={{ height: CHART_HEIGHT }}>
        <FlickeringGrid {...FLICKERING_GRID_PROPS} areaClip={{ data, margin: WORKFLOW_RUNS_GRID_CLIP_MARGIN }} />
      </div>
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-1 bg-linear-to-b from-transparent to-white"
        style={{ height: CHART_HEIGHT }}
        aria-hidden
      />
      <div className="pointer-events-none absolute left-0 top-0 bottom-6 w-6 bg-linear-to-r from-white to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-6 w-6 bg-linear-to-l from-white to-transparent z-10" />
      <ChartContainer config={config} className="relative z-10 w-full" style={{ height: CHART_HEIGHT }}>
        <ComposedChart accessibilityLayer data={data} margin={WORKFLOW_RUNS_GRID_CLIP_MARGIN}>
          <defs>
            {seriesKeys.map((key) => {
              const entry = config[key as keyof typeof config];
              if (!entry || !('color' in entry)) return null;
              const [opacityTop, opacityMid, opacityBottom] = GRADIENT_STOPS[key] ?? [0.12, 0.04, 0];
              const gradientId = `${baseId}-${key}`;
              const midOffset = key === 'completed' ? 20 : 40;

              return (
                <linearGradient key={key} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={opacityTop} />
                  <stop offset={`${midOffset}%`} stopColor={entry.color} stopOpacity={opacityMid} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={opacityBottom} />
                </linearGradient>
              );
            })}
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={<CustomTick />}
            interval={Math.max(0, Math.floor(data.length / 3) - 1)}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis hide domain={[0, 'auto']} />
          {includeTooltip && <ChartTooltip cursor={false} content={<NovuTooltip showTotal />} />}
          {seriesKeys.map((key) => {
            const entry = config[key as keyof typeof config];
            if (!entry || !('color' in entry)) return null;
            const gradientId = `${baseId}-${key}`;
            const label = typeof entry.label === 'string' ? entry.label : String(entry.label ?? key);

            return (
              <Area
                key={key}
                dataKey={key}
                name={label}
                stroke={entry.color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: entry.color }}
                type="monotone"
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

type Variant = 'legacy' | 'finalStatus';

const VARIANT_CONFIG: Record<
  Variant,
  {
    config: ChartConfig;
    seriesKeys: readonly string[];
    hasDataChecker: (dataPoint: WorkflowRunsChartData) => boolean;
    getTotal: (d: WorkflowRunsChartData) => number;
    mapDataPoint: (dataPoint: WorkflowRunsTrendDataPoint) => WorkflowRunsChartDataWithTotal;
  }
> = {
  legacy: {
    config: LEGACY_CHART_CONFIG,
    seriesKeys: LEGACY_SERIES_KEYS,
    hasDataChecker: (p) => (p.completed || 0) > 0 || (p.processing || 0) > 0 || (p.error || 0) > 0,
    getTotal: (d) => (d.completed ?? 0) + (d.processing ?? 0) + (d.error ?? 0),
    mapDataPoint: (p) => ({
      date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: p.completed,
      processing: p.processing,
      error: p.error,
      timestamp: p.timestamp,
      total: (p.completed ?? 0) + (p.processing ?? 0) + (p.error ?? 0),
    }),
  },
  finalStatus: {
    config: FINAL_STATUS_CHART_CONFIG,
    seriesKeys: FINAL_STATUS_SERIES_KEYS,
    hasDataChecker: (p) => (p.completed || 0) > 0 || (p.error || 0) > 0,
    getTotal: (d) => (d.completed ?? 0) + (d.error ?? 0),
    mapDataPoint: (p) => ({
      date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: p.completed,
      error: p.error,
      timestamp: p.timestamp,
      total: (p.completed ?? 0) + (p.error ?? 0),
    }),
  },
};

function WorkflowRunsTrendChartInner({
  variant,
  data,
  count,
  periodLabel,
  isLoading,
  error,
}: WorkflowRunsTrendChartProps & { variant: Variant }) {
  const baseId = useId();
  const { config, seriesKeys, getTotal } = VARIANT_CONFIG[variant];

  const chartData = useMemo(
    () => data?.map((p) => VARIANT_CONFIG[variant].mapDataPoint(p)) ?? undefined,
    [data, variant]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: hasDataChecker must be recreated when variant changes
  const hasDataChecker = useCallback(
    createDateBasedHasDataChecker<WorkflowRunsChartData>(VARIANT_CONFIG[variant].hasDataChecker),
    [variant]
  );

  const mapToWithTotal = useCallback(
    (d: WorkflowRunsChartData): WorkflowRunsChartDataWithTotal => ({ ...d, total: getTotal(d) }),
    [getTotal]
  );

  const renderChart = useCallback(
    (chartDataToRender: WorkflowRunsChartDataWithTotal[], includeTooltip = true) =>
      renderWorkflowRunsChartContent({
        data: chartDataToRender,
        includeTooltip,
        config,
        seriesKeys,
        baseId,
      }),
    [baseId, config, seriesKeys]
  );

  const renderEmptyState = useCallback(
    (dummyData: WorkflowRunsChartDataWithTotal[]) => renderChart(dummyData, false),
    [renderChart]
  );

  const dummyDataGenerator = useCallback(() => generateDummyWorkflowRunsData().map(mapToWithTotal), [mapToWithTotal]);

  return (
    <ChartWrapper<WorkflowRunsChartDataWithTotal>
      title="Workflow runs"
      data={chartData}
      isLoading={isLoading}
      error={error}
      hasDataChecker={hasDataChecker}
      dummyDataGenerator={dummyDataGenerator}
      emptyStateRenderer={renderEmptyState}
      infoTooltip={ANALYTICS_TOOLTIPS.WORKFLOW_RUNS_TREND}
      emptyStateTitle="Not enough data to show"
      emptyStateTooltip={ANALYTICS_TOOLTIPS.INSUFFICIENT_DATE_RANGE}
      count={count}
      periodLabel={periodLabel}
      footer={<BillingNudge />}
    >
      {renderChart}
    </ChartWrapper>
  );
}

export function WorkflowRunsTrendChart(props: WorkflowRunsTrendChartProps) {
  const isFinalStatusOnly = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_COUNT_ENABLED);

  return <WorkflowRunsTrendChartInner {...props} variant={isFinalStatusOnly ? 'finalStatus' : 'legacy'} />;
}
