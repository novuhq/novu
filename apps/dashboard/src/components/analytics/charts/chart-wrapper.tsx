import { ReactNode, useMemo } from 'react';
import { FlickeringGridPlaceholder } from '../components/flickering-grid-placeholder';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { HelpTooltipIndicator } from '../../primitives/help-tooltip-indicator';
import { ChartEmptyState } from './chart-empty-state';

type ChartDataPoint = Record<string, unknown>;

type ChartWrapperProps<T extends ChartDataPoint = ChartDataPoint> = {
  title: string;
  data?: T[];
  isLoading?: boolean;
  error?: Error | null;
  hasDataChecker: (data: T[]) => boolean;
  loadingSkeleton?: ReactNode;
  dummyDataGenerator: () => T[];
  children: (data: T[]) => ReactNode;
  emptyStateRenderer: (dummyData: T[]) => ReactNode;
  errorMessage?: string;
  infoTooltip?: React.ReactNode;
  emptyStateTitle?: string;
  emptyStateTooltip?: React.ReactNode;
  count?: number;
  countLabel?: string;
  periodLabel?: string;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  contentMinHeight?: number;
};

export function ChartWrapper<T extends ChartDataPoint = ChartDataPoint>({
  title,
  data,
  isLoading,
  error,
  hasDataChecker,
  loadingSkeleton,
  dummyDataGenerator,
  children,
  emptyStateRenderer,
  errorMessage = 'Failed to load chart data',
  infoTooltip,
  emptyStateTitle,
  emptyStateTooltip,
  count,
  countLabel = 'runs',
  periodLabel,
  headerExtra,
  footer,
  contentMinHeight = 80,
}: ChartWrapperProps<T>) {
  const hasData = useMemo(() => {
    if (!data || data.length === 0) return false;
    return hasDataChecker(data);
  }, [data, hasDataChecker]);

  const dummyData = useMemo(() => dummyDataGenerator(), [dummyDataGenerator]);

  const showCountBlock = count !== undefined && periodLabel !== undefined;

  return (
    <Card className="shadow-box-xs border-none h-full flex flex-col min-h-0">
      <CardHeader className="bg-transparent p-2.5 pb-0 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-code text-[12px] text-text-sub font-normal uppercase flex items-center gap-0.5 tracking-[normal] shrink-0">
            {title}
            {infoTooltip && <HelpTooltipIndicator text={infoTooltip} />}
          </CardTitle>
          <div className="flex items-center gap-3">
            {showCountBlock && (
              <div className="text-title-h5 font-semibold text-text-sub tabular-nums shrink-0 text-right">
                <span>{count.toLocaleString()}</span>
                <span className="text-label-sm text-text-soft font-normal ml-0.5">{countLabel}</span>
              </div>
            )}
            {headerExtra}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 pt-1.5 flex flex-col gap-1.5 flex-1 min-h-0 overflow-visible">
        <div className="flex flex-col flex-1 min-h-0 overflow-visible" style={{ minHeight: contentMinHeight }}>
          {isLoading ? (
            loadingSkeleton ?? (
              <FlickeringGridPlaceholder
                className="w-full"
                minHeight={contentMinHeight}
                topFadeHeight={40}
                bottomFadeHeight={32}
              />
            )
          ) : error ? (
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              <div className="text-sm text-text-soft">{errorMessage}</div>
            </div>
          ) : !hasData ? (
            <ChartEmptyState title={emptyStateTitle} tooltip={emptyStateTooltip}>
              {emptyStateRenderer(dummyData)}
            </ChartEmptyState>
          ) : (
            data && children(data)
          )}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
