import NumberFlow from '@number-flow/react';
import { useEffect, useState } from 'react';
import { getCompactFormat, parseFormattedNumber } from '../../utils/number-formatting';

type AnimatedNumberProps = {
  value: string | number;
  isLoading?: boolean;
  duration?: number;
  className?: string;
  showSuffix?: boolean;
};

export function AnimatedNumber({
  value,
  isLoading = false,
  duration = 1200,
  className = '',
  showSuffix = true,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  const rawNumber = parseFormattedNumber(value);
  const { value: compactValue, suffix } = getCompactFormat(rawNumber);

  useEffect(() => {
    // Only reset to 0 on the very first load, not on subsequent loading states
    if (isLoading && !hasInitialLoad) {
      setDisplayValue(0);
      return;
    }

    // Don't update the value while loading after initial load
    if (isLoading && hasInitialLoad) {
      return;
    }

    // Mark that we've had our initial load
    if (!hasInitialLoad) {
      setHasInitialLoad(true);
    }

    // Small delay to ensure the component is mounted before starting animation
    const timer = setTimeout(() => {
      setDisplayValue(showSuffix ? compactValue : rawNumber);
    }, 100);

    return () => clearTimeout(timer);
  }, [compactValue, rawNumber, isLoading, showSuffix, hasInitialLoad]);

  return (
    <div className={`flex items-baseline ${className}`}>
      <NumberFlow
        value={displayValue}
        format={{
          maximumFractionDigits: showSuffix ? 1 : 0,
        }}
        locales="en-US"
        transformTiming={{ duration, easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)' }}
      />
      {showSuffix && suffix && <span className="ml-0">{suffix}</span>}
    </div>
  );
}
