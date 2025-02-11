import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import TruncatedText from '@/components/truncated-text';
import { memo, useState } from 'react';
import { RiTimeLine } from 'react-icons/ri';
import { useTimezoneSelect } from 'react-timezone-select';

// Define a type for timezone options.
type TimezoneOption = {
  label: string;
  value: string;
};

interface TimezoneOptionsProps {
  options: TimezoneOption[];
}

// Extracted and memoized component for rendering timezone options.
const TimezoneOptions = memo(function TimezoneOptions({ options }: TimezoneOptionsProps) {
  return (
    <>
      {options.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </>
  );
});

export function TimezoneSelect({
  value,
  defaultOption,
  disabled,
  onValueChange,
  readOnly,
  required,
}: {
  value?: string;
  defaultOption?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  onValueChange: (val: string) => void;
}) {
  // State to track whether the select is open.
  const [isOpen, setIsOpen] = useState(false);
  // Get timezone options and the parse function.
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', displayValue: 'UTC' });

  const handleValueChange = (val: string) => {
    const parsedValue = parseTimezone(val);
    onValueChange(parsedValue.value);
  };

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
      defaultValue={defaultOption}
      open={readOnly ? false : isOpen}
      onOpenChange={(open) => setIsOpen(open)}
    >
      <SelectTrigger className="focus:ring-stroke-strong group overflow-hidden p-1.5 focus:ring-1">
        <SelectValue
          placeholder={
            <div className="flex w-full items-center gap-1">
              <div>
                <RiTimeLine className="size-4" />
              </div>
              <TruncatedText className="text-sm">Select a timezone</TruncatedText>
            </div>
          }
          asChild
          className="w-full overflow-hidden"
        >
          <div className="flex max-w-full flex-1 items-center gap-1 overflow-hidden">
            <div>
              <RiTimeLine className="size-4" />
            </div>
            {value && (
              <TruncatedText className="text-foreground w-full min-w-0 flex-1 text-sm">
                {parseTimezone(value).label}
              </TruncatedText>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      {isOpen && (
        <SelectContent>
          <TimezoneOptions options={options} />
        </SelectContent>
      )}
    </Select>
  );
}
