import { locales } from '@/utils/locales';
import { cn } from '@/utils/ui';
import { RiArrowDownSLine, RiEarthLine } from 'react-icons/ri';
import { type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { Button } from '../primitives/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { ScrollArea } from '../primitives/scroll-area';
import TruncatedText from '../truncated-text';
import { useState } from 'react';

export function LocaleSelect({
  value,
  onChange,
  disabled,
  readOnly,
}: {
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentCountryCode = value?.split('_')?.[1] as Country;
  const CurrentFlag = currentCountryCode ? flags[currentCountryCode] : RiEarthLine;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          className="flex h-8 w-full items-center justify-between gap-1 rounded-lg border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <div className="flex max-w-full flex-1 items-center gap-1 overflow-hidden">
            <span className="inline-flex gap-1">
              {CurrentFlag && <CurrentFlag title={currentCountryCode} className="size-4" />}
              {value || <span className="text-neutral-400">locale</span>}
            </span>

            <RiArrowDownSLine
              className={cn('ml-auto size-4 opacity-50', disabled || readOnly ? 'hidden' : 'opacity-100')}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] rounded-lg border-t-0 p-0">
        <Command>
          <CommandInput placeholder="Search locale..." />
          <CommandList>
            <CommandEmpty>No locale found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup className="rounded-md py-2">
                {locales.map((item) => (
                  <FlagItem
                    countryCode={item.alpha2}
                    languageName={item.langName}
                    value={item.langIso}
                    key={item.langIso}
                    onChange={(val) => {
                      onChange(val);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const FlagItem = ({
  countryCode,
  languageName,
  value,
  onChange,
}: {
  countryCode: string;
  languageName: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const CurrentFlag = countryCode ? flags[countryCode as Country] : RiEarthLine;

  return (
    <CommandItem className="gap-3" onSelect={() => onChange(value)}>
      <div className="flex w-full items-center gap-2">
        <div>{CurrentFlag && <CurrentFlag className="size-4" title={countryCode} />}</div>
        <TruncatedText className="text-sm">
          {value} - {languageName}
        </TruncatedText>
      </div>
    </CommandItem>
  );
};
