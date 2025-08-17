import { ComponentType } from 'react';
import { cn } from '@/utils/ui';
import { useDelayedLoading } from '../../hooks/use-delayed-loading';
import { TrendLineDown } from '../icons/trend-line-down';
import { TrendLineUp } from '../icons/trend-line-up';
import { AnimatedNumber } from './animated-number';
import { HelpTooltipIndicator } from './help-tooltip-indicator';
import { Skeleton } from './skeleton';

type TrendDirection = 'up' | 'down' | 'neutral';

type AnalyticsCardProps = {
  /** The main metric value to display (e.g., 1718, "124.5K", "$45,230") */
  value: string | number;
  /** The title/name of the metric being displayed */
  title: string;
  /** Optional custom description. If not provided, will auto-generate from title and timeframe */
  description?: string;
  /** The percentage change to show in the trend badge */
  percentageChange?: number;
  /** Direction of the trend to determine color scheme */
  trendDirection?: TrendDirection;
  /** Additional CSS classes to apply to the card */
  className?: string;
  /** Icon component to display next to the title */
  icon?: ComponentType<{ className?: string }>;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Tooltip content to show when hovering over the info icon */
  infoTooltip?: React.ReactNode;
};

function getTrendColor(direction: TrendDirection) {
  switch (direction) {
    case 'up':
      return {
        text: 'text-success-base',
        icon: TrendLineUp,
      };
    case 'down':
      return {
        text: 'text-error-base',
        icon: TrendLineDown,
      };
    default:
      return {
        text: 'text-neutral-400',
        icon: TrendLineUp,
      };
  }
}

function formatPercentage(percentage: number): string {
  const rounded = Math.round(percentage * 10) / 10; // Round to 1 decimal place
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1); // Remove .0 if whole number
}

/**
 * A reusable analytics card component that displays metrics with trend indicators.
 * Based on the updated Figma design system with compact layout.
 *
 * @example
 * ```tsx
 * import { RiUserLine } from 'react-icons/ri';
 *
 * <AnalyticsCard
 *   value={1718}
 *   title="Active subscribers"
 *   description="+400 compared to prior 30 days"
 *   percentageChange={3}
 *   trendDirection="up"
 *   icon={RiUserLine}
 *   isLoading={false}
 * />
 * ```
 */

export function AnalyticsCard({
  value,
  title,
  description,
  percentageChange,
  trendDirection = 'neutral',
  className,
  icon: IconComponent,
  isLoading = false,
  infoTooltip,
}: AnalyticsCardProps) {
  const showSkeleton = useDelayedLoading(isLoading);

  if (showSkeleton) {
    return (
      <div className={cn('bg-bg-white rounded-12 p-3 shadow-box-xs w-full min-h-[108px]', className)}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {IconComponent && <IconComponent className="size-4 text-icon-sub" />}
              <span className="text-label-sm text-text-sub">{title}</span>
              {infoTooltip && <HelpTooltipIndicator text={infoTooltip} />}
            </div>
            <Skeleton className="h-3 w-8 rounded-full" />
          </div>

          <Skeleton className="h-8 w-16 mt-1" />

          <Skeleton className="h-3 w-32 mt-2" />
        </div>
      </div>
    );
  }

  const trendColors = getTrendColor(trendDirection);

  return (
    <div className={cn('bg-bg-white rounded-12 p-3 shadow-box-xs w-full', className)}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {IconComponent && <IconComponent className="size-4 text-icon-sub" />}
            <span className="text-label-sm text-text-sub">{title}</span>
            {infoTooltip && <HelpTooltipIndicator text={infoTooltip} />}
          </div>

          {percentageChange !== undefined && (
            <div className="flex items-center gap-1 px-1">
              <trendColors.icon className={cn('size-2', trendColors.text)} />
              <span className={cn('text-subheading-2xs uppercase', trendColors.text)}>
                {formatPercentage(Math.abs(percentageChange))}%
              </span>
            </div>
          )}
        </div>

        <div className="text-title-h5 text-text-strong font-semibold">
          <AnimatedNumber value={value} isLoading={isLoading} />
        </div>

        {description && <div className="text-paragraph-xs text-text-soft">{description}</div>}
      </div>
    </div>
  );
}
