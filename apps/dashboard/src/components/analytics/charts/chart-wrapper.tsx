import { ReactNode, useMemo } from 'react';
import { useDelayedLoading } from '../../../hooks/use-delayed-loading';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
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
}: ChartWrapperProps<T>) {
  const hasData = useMemo(() => {
    if (!data || data.length === 0) return false;
    return hasDataChecker(data);
  }, [data, hasDataChecker]);

  const dummyData = useMemo(() => dummyDataGenerator(), [dummyDataGenerator]);

  if (isLoading) {
    return loadingSkeleton;
  }

  if (error) {
    return (
      <Card className="shadow-box-xs border-none">
        <CardHeader className="bg-transparent p-3 pb-0">
          <CardTitle className="text-label-sm text-text-sub">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="h-[160px] w-full flex items-center justify-center">
            <div className="text-sm text-text-soft">{errorMessage}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="shadow-box-xs border-none">
        <CardHeader className="bg-transparent p-3 pb-0">
          <CardTitle className="text-label-sm text-text-sub">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <ChartEmptyState>{emptyStateRenderer(dummyData)}</ChartEmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-box-xs border-none">
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3">{data && children(data)}</CardContent>
    </Card>
  );
}
