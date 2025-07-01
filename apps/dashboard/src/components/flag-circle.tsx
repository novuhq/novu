import { RiEarthLine } from 'react-icons/ri';
import { type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { cn } from '@/utils/ui';

// Helper function to get flag for locale
function getLocaleFlag(localeCode: string) {
  const countryCode = localeCode.split('_')?.[1] as Country;
  return (countryCode && flags[countryCode]) || RiEarthLine;
}

type FlagCircleProps = {
  locale: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBorder?: boolean;
  style?: React.CSSProperties;
};

export function FlagCircle({ locale, size = 'md', className, showBorder = false, style }: FlagCircleProps) {
  const Flag = getLocaleFlag(locale);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const borderClasses = showBorder ? 'border-2 border-white' : '';

  return (
    <div
      className={cn('overflow-hidden rounded-full', sizeClasses[size], borderClasses, className)}
      style={style}
      title={locale}
    >
      <Flag className="h-full w-full scale-150 object-cover" title={locale} />
    </div>
  );
}

type StackedFlagCirclesProps = {
  locales: string[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function StackedFlagCircles({ locales, maxVisible = 4, size = 'md', className }: StackedFlagCirclesProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const overlapOffset = {
    sm: '-6px',
    md: '-8px',
    lg: '-10px',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {locales.slice(0, maxVisible).map((locale, index) => (
        <FlagCircle
          key={locale}
          locale={locale}
          size={size}
          showBorder={true}
          className={cn({
            relative: true,
          })}
          style={{
            marginLeft: index > 0 ? overlapOffset[size] : '0',
            zIndex: index + 1,
          }}
        />
      ))}
      {locales.length > maxVisible && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-xs font-medium text-neutral-700',
            sizeClasses[size]
          )}
          style={{
            marginLeft: overlapOffset[size],
            zIndex: maxVisible + 1,
          }}
        >
          +{locales.length - maxVisible}
        </div>
      )}
    </div>
  );
}
