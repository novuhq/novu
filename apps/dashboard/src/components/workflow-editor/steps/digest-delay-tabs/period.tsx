import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { cn } from '@/utils/ui';
import { PeriodValues } from './utils';

const PERIOD_OPTIONS = [
  { value: PeriodValues.MINUTE, label: 'minute' },
  { value: PeriodValues.HOUR, label: 'hour' },
  { value: PeriodValues.DAY, label: 'day' },
  { value: PeriodValues.WEEK, label: 'week' },
  { value: PeriodValues.MONTH, label: 'month' },
];

export const Period = ({
  value,
  isDisabled,
  onPeriodChange,
}: {
  value: string;
  isDisabled?: boolean;
  onPeriodChange: (val: string) => void;
}) => {
  return (
    <Select onValueChange={onPeriodChange} defaultValue={PeriodValues.MINUTE} disabled={isDisabled} value={value}>
      <SelectTrigger size="2xs" className={cn('w-full gap-1 text-xs')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        onBlur={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {PERIOD_OPTIONS.map(({ label, value }) => (
          <SelectItem key={value} value={value}>
            <span className="text-foreground-600 text-xs font-medium">{label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
