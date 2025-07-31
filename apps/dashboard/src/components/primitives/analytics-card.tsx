import { cn } from '@/utils/ui';

const imgTrendUp = 'http://localhost:3845/assets/393dfc00ea13a079c809c149114eb29aa2227901.svg';
const imgSubscriber = 'http://localhost:3845/assets/4cd099d18b6d02cff96983297e65331c2d8ecb1b.svg';

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
  /** Icon to display next to the title */
  icon?: string;
};

function getTrendColor(direction: TrendDirection) {
  switch (direction) {
    case 'up':
      return {
        bg: 'bg-[rgba(31,193,103,0.1)]',
        text: 'text-[#1fc16b]',
        icon: imgTrendUp,
      };
    case 'down':
      return {
        bg: 'bg-[rgba(244,67,54,0.1)]',
        text: 'text-[#f44336]',
        icon: imgTrendUp, // You might want a different icon for down trend
      };
    default:
      return {
        bg: 'bg-[rgba(158,158,158,0.1)]',
        text: 'text-[#9e9e9e]',
        icon: imgTrendUp,
      };
  }
}

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return value;
}

/**
 * A reusable analytics card component that displays metrics with trend indicators.
 * Based on the updated Figma design system with compact layout.
 *
 * @example
 * ```tsx
 * <AnalyticsCard
 *   value={1718}
 *   title="Active subscribers"
 *   description="+400 compared to prior 30 days"
 *   percentageChange={3}
 *   trendDirection="up"
 *   icon={imgSubscriber}
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
  icon = imgSubscriber,
}: AnalyticsCardProps) {
  const trendColors = getTrendColor(trendDirection);
  const formattedValue = formatValue(value);

  return (
    <div
      className={cn('box-border flex flex-col items-start justify-start p-0 relative rounded-xl size-full', className)}
    >
      <div className="bg-[#ffffff] box-border flex flex-col gap-1.5 items-start justify-center overflow-clip p-3 relative rounded-xl shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06)] shrink-0 w-full">
        <div className="box-border flex flex-col gap-0.5 items-start justify-center p-0 relative shrink-0 w-full">
          {/* Header with title and percentage */}
          <div className="box-border flex flex-row items-center justify-between p-0 relative shrink-0 w-full">
            <div className="box-border flex flex-row gap-1 items-center justify-start p-0 relative shrink-0">
              <div className="overflow-clip relative shrink-0 size-4">
                <div className="absolute inset-[12.5%]">
                  <img alt="" className="block max-w-none size-full" src={icon} />
                </div>
              </div>
              <div className="font-['Inter'] font-medium text-[14px] text-[#525866] leading-[20px] tracking-[-0.084px]">
                {title}
              </div>
            </div>

            {percentageChange !== undefined && (
              <div className="box-border flex flex-row gap-2.5 items-center justify-start p-1 relative shrink-0">
                <div className="box-border flex flex-row gap-1 items-center justify-start p-0 relative shrink-0">
                  <div className="h-1.5 relative shrink-0 w-[10.909px]">
                    <img alt="" className="block max-w-none size-full" src={trendColors.icon} />
                  </div>
                  <div
                    className={cn(
                      'font-["Inter"] font-medium text-[11px] leading-[12px] tracking-[0.22px] uppercase',
                      trendColors.text
                    )}
                  >
                    {Math.abs(percentageChange)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main value */}
          <div className="box-border flex flex-row gap-2.5 items-center justify-start p-0 relative shrink-0">
            <div className="flex flex-col font-['Inter'] font-semibold h-8 justify-center text-[24px] text-[#0e121b] relative shrink-0 w-[87px]">
              {formattedValue}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="box-border flex flex-col items-start justify-start p-0 relative shrink-0 w-full">
              <div className="flex flex-col font-['Inter'] font-normal justify-center text-[12px] text-[#99a0ae] leading-[16px] relative shrink-0 w-full">
                {description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
