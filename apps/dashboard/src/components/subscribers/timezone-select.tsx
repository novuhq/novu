import { cn } from '@/utils/ui';
import { useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine, RiTimeLine } from 'react-icons/ri';
import { useTimezoneSelect } from 'react-timezone-select';
import { Button, ButtonProps } from '../primitives/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import TruncatedText from '../truncated-text';

type TimezoneSelectProps = ButtonProps & {
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: string) => void;
};

export function TimezoneSelect(props: TimezoneSelectProps) {
  const { value, disabled, readOnly, onChange, className, ...rest } = props;
  const [open, setOpen] = useState(false);
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', displayValue: 'UTC' });
  const listRef = useRef<HTMLDivElement>(null);
  const scrollId = useRef<ReturnType<typeof setTimeout>>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          mode="outline"
          className={cn('flex h-8 w-full items-center gap-1 truncate rounded-lg px-3 focus:z-10', className)}
          disabled={disabled}
          {...rest}
        >
          <div className="flex max-w-full flex-1 items-center gap-1 overflow-hidden">
            <div>
              <RiTimeLine className="size-4 text-neutral-400" />
            </div>
            {value ? (
              <TruncatedText className="text-foreground w-full min-w-0 flex-1 text-xs font-normal text-neutral-950">
                {parseTimezone(value).label}
              </TruncatedText>
            ) : (
              <TruncatedText className="w-full min-w-0 flex-1 text-xs font-normal text-neutral-400">
                Search timezone...
              </TruncatedText>
            )}
            <RiArrowDownSLine
              className={cn('ml-auto size-4 opacity-50', disabled || readOnly ? 'hidden' : 'opacity-100')}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] rounded-lg p-0">
        <Command>
          <CommandInput
            placeholder="Search timezone..."
            inputRootClassName="rounded-b-none before:ring-0 before:border-b has-[input:focus]:shadow-none focus-within:shadow-none px-1.5"
            inlineLeadingNode={<RiSearchLine className="size-4 text-neutral-400" />}
            /**
             * Scroll to top bug workaround: https://github.com/pacocoursey/cmdk/issues/233#issuecomment-2015998940
             */
            onValueChange={() => {
              // clear pending scroll
              clearTimeout(scrollId.current);

              // the setTimeout is used to create a new task
              // this is to make sure that we don't scroll until the user is done typing
              // you can tweak the timeout duration ofc
              scrollId.current = setTimeout(() => {
                // inside your list select the first group and scroll to the top
                const div = listRef.current;
                div?.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            }}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>No timezone found.</CommandEmpty>

            <CommandGroup className="rounded-md p-2">
              {options.map((item) => (
                <CommandItem
                  className={cn('cursor-pointer', {
                    'bg-accent': value === item.value,
                  })}
                  onSelect={() => {
                    const parsedValue = parseTimezone(item.value);
                    onChange(parsedValue.value);
                    setOpen(false);
                  }}
                  key={item.value}
                >
                  {item.label}
                  <RiCheckLine className={`ml-auto size-4 ${value === item.value ? 'opacity-100' : 'opacity-0'}`} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
