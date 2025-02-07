import { cn } from '@/utils/ui';
import { RiArrowDownSLine, RiTimeLine } from 'react-icons/ri';
import { useTimezoneSelect } from 'react-timezone-select';
import { Button } from '../primitives/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { ScrollArea } from '../primitives/scroll-area';
import TruncatedText from '../truncated-text';
import { useState } from 'react';

export function TimezoneSelect({
  value,
  disabled,
  onChange,
  readOnly,
}: {
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', displayValue: 'UTC' });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          className="flex h-8 w-full items-center gap-1 rounded-lg px-3 focus:z-10"
          disabled={disabled}
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
            <RiArrowDownSLine
              className={cn('ml-auto size-4 opacity-50', disabled || readOnly ? 'hidden' : 'opacity-100')}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] rounded-lg border-t-0 p-0">
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup className="rounded-md py-2">
                {options.map((item) => (
                  <CommandItem
                    className="gap-3"
                    onSelect={() => {
                      const parsedValue = parseTimezone(item.value);
                      onChange(parsedValue.value);
                      setOpen(false);
                    }}
                    key={item.value}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
