import { locales } from '@/utils/locales';
import { RiEarthLine } from 'react-icons/ri';
import { CountryFlags } from '../icons/country-flags';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import TruncatedText from '../truncated-text';

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
                <div>
                  <CountryFlags name={value.split('_')?.[1]} className="size-4" />
                </div>
                <TruncatedText className="text-sm">{value}</TruncatedText>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="p-1">
        {locales.map((item) => (
          <SelectItem key={item.langIso} value={item.langIso} className="px-2">
            <div className="flex w-full items-center gap-2">
              <div>
                <CountryFlags name={item.alpha2} className="size-4" />
              </div>
              <TruncatedText className="text-sm">
                {item.langIso} - {item.langName}
              </TruncatedText>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
