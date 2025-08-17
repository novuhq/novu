import { ReactNode, useMemo } from 'react';
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
  loadingSkeleton: ReactNode;
  dummyDataGenerator: () => T[];
  children: (data: T[]) => ReactNode;
  emptyStateRenderer: (dummyData: T[]) => ReactNode;
  errorMessage?: string;
  infoTooltip?: React.ReactNode;
  emptyStateTitle?: string;
  emptyStateTooltip?: React.ReactNode;
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
}: ChartWrapperProps<T>) {
  const hasData = useMemo(() => {
    if (!data || data.length === 0) return false;
    return hasDataChecker(data);
  }, [data, hasDataChecker]);

  const dummyData = useMemo(() => dummyDataGenerator(), [dummyDataGenerator]);

  return (
    <Card className="shadow-box-xs border-none h-full">
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub font-medium flex items-center gap-0.5 tracking-[normal]">
          {title}
          {infoTooltip && <HelpTooltipIndicator text={infoTooltip} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {isLoading ? (
          loadingSkeleton
        ) : error ? (
          <div className="h-[160px] w-full flex items-center justify-center">
            <div className="text-sm text-text-soft">{errorMessage}</div>
          </div>
        ) : !hasData ? (
          <ChartEmptyState title={emptyStateTitle} tooltip={emptyStateTooltip}>
            {emptyStateRenderer(dummyData)}
          </ChartEmptyState>
        ) : (
          data && children(data)
        )}
      </CardContent>
    </Card>
  );
}
