import { useMemo, useState } from 'react';
import { RiCheckLine } from 'react-icons/ri';
import { CaretSortIcon } from '@radix-ui/react-icons';

import { cn } from '@/utils/ui';
import TruncatedText from '@/components/truncated-text';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/primitives/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/primitives/command';
import { selectTriggerVariants } from '@/components/primitives/select';

export const MultiSelect = <T extends string | number>({
  values,
  options,
  isDisabled,
  placeholder,
  placeholderSelected,
  placeholderAll,
  className,
  onValuesChange,
}: {
  values: T[];
  options: Array<{ value: T; label: string }>;
  isDisabled?: boolean;
  placeholder?: string;
  placeholderSelected?: string;
  placeholderAll?: string;
  className?: string;
  onValuesChange: (values: T[]) => void;
}) => {
  const [openCombobox, setOpenCombobox] = useState(false);
  const selectedValues = useMemo(
    () => options.filter(({ value: optionValue }) => values.includes(optionValue)),
    [values, options]
  );

  const onComboboxOpenChange = (value: boolean) => {
    setOpenCombobox(value);
  };

  const onSelectValue = (value: T) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((el) => el !== value));
    } else {
      onValuesChange([...values, value]);
    }

    setOpenCombobox(false);
  };

  return (
    <Popover open={openCombobox} onOpenChange={onComboboxOpenChange}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={openCombobox}
          className={cn(selectTriggerVariants({ size: '2xs', className }))}
          disabled={isDisabled}
        >
          <TruncatedText className="text-xs">
            {selectedValues.length === 0 && (placeholder ?? 'Select options')}
            {selectedValues.length === 1 && selectedValues[0].label}
            {selectedValues.length === 2 && selectedValues.map(({ label }) => label).join(', ')}
            {selectedValues.length === options.length
              ? (placeholderAll ?? 'All selected')
              : selectedValues.length > 2 && `${selectedValues.length} ${placeholderSelected ?? 'selected'}`}
            {}
          </TruncatedText>
          <CaretSortIcon className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <Command loop>
          <PopoverContent className="min-w-[150px] p-0">
            <CommandList>
              <CommandGroup className="max-h-[145px] overflow-auto">
                {options.map(({ value, label }) => {
                  const isActive = values.includes(value);
                  return (
                    <CommandItem key={value} value={`${value}`} onSelect={() => onSelectValue(value)}>
                      <span className="flex-1">{label}</span>
                      <RiCheckLine className={cn('h-4 w-4', isActive ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </PopoverContent>
        </Command>
      </PopoverPortal>
    </Popover>
  );
};
