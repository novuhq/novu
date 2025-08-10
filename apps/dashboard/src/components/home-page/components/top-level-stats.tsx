import { ReactNode } from 'react';
import { TrendLineDown } from '../../icons/trend-line-down';
import { TrendLineUp } from '../../icons/trend-line-up';

type TopLevelStatsProps = {
  value: string;
  percentageChange: number;
  trendDirection: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
  dateFilter?: ReactNode;
  periodLabel?: string;
};

function formatPercentage(percentage: number) {
  return percentage < 1 ? '<1' : Math.round(percentage).toString();
}

function getTrendStyles(trendDirection: 'up' | 'down' | 'neutral') {
  switch (trendDirection) {
    case 'up':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
        icon: <TrendLineUp />,
      };
    case 'down':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
        icon: <TrendLineDown />,
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        icon: <TrendLineUp />,
      };
  }
}

export function TopLevelStats({
  value,
  percentageChange,
  trendDirection,
  isLoading = false,
  dateFilter,
  periodLabel = 'selected period',
}: TopLevelStatsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-1">
            <div className="h-[52px] w-32 bg-gray-200 animate-pulse rounded"></div>
            <div className="pb-2">
              <div className="h-4 w-12 bg-gray-200 animate-pulse rounded-full"></div>
            </div>
          </div>
          {dateFilter && <div className="pb-2">{dateFilter}</div>}
        </div>
        <div className="h-4 w-80 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  const trendStyles = getTrendStyles(trendDirection);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-1">
          <h2 className="text-text-strong font-medium text-[44px] leading-[52px]">{value}</h2>
          <div className="pb-2">
            {!!percentageChange && (
              <div
                className={`flex items-center gap-0.5 ${trendStyles.bgColor} px-1 h-4 rounded-full ${trendStyles.textColor} text-subheading-2xs uppercase`}
              >
                {trendStyles.icon}
                <span className="text-subheading-2xs uppercase">{formatPercentage(percentageChange)}%</span>
              </div>
            )}
          </div>
        </div>
        {dateFilter && <div className="pb-2">{dateFilter}</div>}
      </div>
      <p className="text-sm text-[#99a0ae]">Workflow runs during the {periodLabel}.</p>
    </div>
  );
}
