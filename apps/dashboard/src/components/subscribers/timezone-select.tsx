import { useTimezoneSelect } from 'react-timezone-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { RiTimeLine } from 'react-icons/ri';
import TruncatedText from '../truncated-text';

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
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', displayValue: 'UTC' });

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        const parsedValue = parseTimezone(val);
        onValueChange(parsedValue.value);
      }}
      disabled={disabled || readOnly}
      required={required}
      defaultValue={defaultOption}
    >
      <SelectTrigger className="focus:ring-stroke-strong group overflow-hidden p-1.5 shadow-sm focus:ring-1">
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
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
