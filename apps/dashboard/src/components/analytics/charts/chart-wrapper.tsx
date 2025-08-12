import { ReactNode, useMemo } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../primitives/tooltip';
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
}: ChartWrapperProps<T>) {
  const hasData = useMemo(() => {
    if (!data || data.length === 0) return false;
    return hasDataChecker(data);
  }, [data, hasDataChecker]);

  const dummyData = useMemo(() => dummyDataGenerator(), [dummyDataGenerator]);

  if (isLoading) {
    return loadingSkeleton;
  }

  return (
    <Card className="shadow-box-xs border-none">
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub flex items-center gap-0.5">
          {title}
          {infoTooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block size-4 text-text-soft hover:text-text-strong cursor-pointer">
                  <RiInformation2Line className="size-full" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs whitespace-pre-line">{infoTooltip}</TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {error ? (
          <div className="h-[160px] w-full flex items-center justify-center">
            <div className="text-sm text-text-soft">{errorMessage}</div>
          </div>
        ) : !hasData ? (
          <ChartEmptyState>{emptyStateRenderer(dummyData)}</ChartEmptyState>
        ) : (
          data && children(data)
        )}
      </CardContent>
    </Card>
  );
}
