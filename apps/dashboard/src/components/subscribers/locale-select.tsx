import { locales } from '@/utils/locales';
import { RiEarthLine } from 'react-icons/ri';
import flags from 'react-phone-number-input/flags';
import { type Country } from 'react-phone-number-input';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import TruncatedText from '../truncated-text';
import { useMemo, useRef } from 'react';

export function LocaleSelect({
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
  const currentCountryCode = value?.split('_')?.[1] as Country;
  const CurrentFlag = currentCountryCode ? flags[currentCountryCode] : RiEarthLine;
  const parentRef = useRef(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: 500,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  console.log({
    virtualItems,
    parentRef: parentRef.current,
  });
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || readOnly}
      required={required}
      defaultValue={defaultOption}
    >
      <SelectTrigger className="focus:ring-stroke-strong group p-1.5 shadow-sm focus:ring-1">
        <SelectValue
          placeholder={
            <div className="flex w-full items-center gap-2">
              <div>
                <RiEarthLine className="size-4" />
              </div>
              <TruncatedText className="text-sm">Locale</TruncatedText>
            </div>
          }
          asChild
        >
          <div className="flex w-full items-center gap-2">
            {value && (
              <>
                <div>{CurrentFlag && <CurrentFlag className="size-4" title={currentCountryCode} />}</div>
                <TruncatedText className="text-sm">{value}</TruncatedText>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="h-64 overflow-auto p-1" ref={parentRef}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((item) => (
            <div>
              <FlagItem key={item.key} index={item.index} />
            </div>
          ))}
        </div>
      </SelectContent>
    </Select>
  );
}

const FlagItem = ({ index }: { index: number }) => {
  const countryCode = locales[index].alpha2;
  const languageName = locales[index].langName;
  const value = locales[index].langIso;
  const CurrentFlag = countryCode ? flags[countryCode as Country] : RiEarthLine;
  console.log({
    countryCode,
    languageName,
    value,
    CurrentFlag,
  });
  return (
    <SelectItem key={value} value={value} className="px-2">
      <div className="flex w-full items-center gap-2">
        <div>{CurrentFlag && <CurrentFlag className="size-4" title={countryCode} />}</div>
        <TruncatedText className="text-sm">
          {value} - {languageName}
        </TruncatedText>
      </div>
    </SelectItem>
  );
};
