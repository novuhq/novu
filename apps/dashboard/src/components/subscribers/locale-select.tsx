import { locales } from '@/utils/locales';
import { cn } from '@/utils/ui';
import { useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiEarthLine, RiSearchLine } from 'react-icons/ri';
import { type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { Button, ButtonProps } from '../primitives/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import TruncatedText from '../truncated-text';

type LocaleSelectProps = ButtonProps & {
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: string) => void;
};

export function LocaleSelect(props: LocaleSelectProps) {
  const { value, disabled, readOnly, onChange, className, ...rest } = props;
  const [open, setOpen] = useState(false);
  const currentCountryCode = value?.split('_')?.[1] as Country;
  const CurrentFlag = currentCountryCode ? flags[currentCountryCode] : RiEarthLine;

  const listRef = useRef<HTMLDivElement>(null);
  const scrollId = useRef<ReturnType<typeof setTimeout>>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          mode="outline"
          className={cn('flex h-8 w-full items-center justify-between gap-1 rounded-lg px-3 focus:z-10', className)}
          disabled={disabled}
          {...rest}
        >
          <div className="flex max-w-full flex-1 items-center gap-1 overflow-hidden">
            <span className="inline-flex gap-1 text-xs font-normal text-neutral-950">
              {CurrentFlag && <CurrentFlag title={currentCountryCode} className="size-4 text-neutral-400" />}
              {value || <span className="text-neutral-400">locale</span>}
            </span>

            <RiArrowDownSLine
              className={cn('ml-auto size-4 opacity-50', disabled || readOnly ? 'hidden' : 'opacity-100')}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] rounded-lg p-0">
        <Command>
          <CommandInput
            placeholder="Search locale..."
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
            <CommandEmpty>No locale found.</CommandEmpty>
            <CommandGroup className="rounded-md p-2">
              {locales.map((item) => (
                <FlagItem
                  countryCode={item.alpha2}
                  languageName={item.langName}
                  optionValue={item.langIso}
                  key={item.langIso}
                  onChange={(val) => {
                    onChange(val);
                    setOpen(false);
                  }}
                  currentValue={value}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const FlagItem = ({
  countryCode,
  languageName,
  optionValue,
  onChange,
  currentValue,
}: {
  countryCode: string;
  languageName: string;
  optionValue: string;
  onChange: (val: string) => void;
  currentValue?: string;
}) => {
  const CurrentFlag = countryCode ? flags[countryCode as Country] : RiEarthLine;
  const isSelected = optionValue === currentValue;

  return (
    <CommandItem
      className={cn('cursor-pointer gap-3', {
        'bg-accent': isSelected,
      })}
      onSelect={() => onChange(optionValue)}
    >
      <div className="flex w-full items-center gap-2">
        {CurrentFlag && <CurrentFlag className="size-4" title={countryCode} />}
        <TruncatedText className="text-sm">
          {optionValue} - {languageName}
        </TruncatedText>
        <RiCheckLine className={cn(`ml-auto size-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`)} />
      </div>
    </CommandItem>
  );
};
