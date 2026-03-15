import { BaseOption, isOptionGroupArray, OptionList } from 'react-querybuilder';

import { SelectGroup, SelectItem, SelectLabel } from '@/components/primitives/select';
import { capitalize } from '@/utils/string';

const EMPTY_SELECT_VALUE = '__empty__';

function toSafeValue(value: string | null | undefined): string {
  if (!value) return EMPTY_SELECT_VALUE;

  return value;
}

export const toSelectOptions = (arr: OptionList, capitalizeLabel: boolean = true) => {
  if (isOptionGroupArray(arr)) {
    return arr.map((group) => (
      <SelectGroup key={group.label}>
        <SelectLabel>{group.label}</SelectLabel>
        {group.options.map((option) => (
          <SelectItem key={toSafeValue(option.value)} value={toSafeValue(option.value)} className="h-6">
            <span className="text-foreground-600 text-label-xs font-medium">
              {capitalizeLabel ? capitalize(option.label.toLocaleLowerCase()) : option.label}
            </span>
          </SelectItem>
        ))}
      </SelectGroup>
    ));
  }

  return (arr as BaseOption<string>[]).map((option) => (
    <SelectItem key={toSafeValue(option.value)} value={toSafeValue(option.value)} className="h-6">
      <span className="text-foreground-600 text-label-xs font-medium">
        {capitalizeLabel ? capitalize(option.label.toLocaleLowerCase()) : option.label}
      </span>
    </SelectItem>
  ));
};
