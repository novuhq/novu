import { isOptionGroupArray, OptionList, BaseOption } from 'react-querybuilder';

import { SelectGroup, SelectItem, SelectLabel } from '@/components/primitives/select';
import { capitalize } from '@/utils/string';

export const toSelectOptions = (arr: OptionList, capitalizeLabel: boolean = true) => {
  if (isOptionGroupArray(arr)) {
    return arr.map((group) => (
      <SelectGroup key={group.label}>
        <SelectLabel>{group.label}</SelectLabel>
        {group.options.map((option) => (
          <SelectItem key={option.value} value={option.value ?? ''} className="h-6">
            <span className="text-foreground-600 text-label-xs font-medium">
              {capitalizeLabel ? capitalize(option.label.toLocaleLowerCase()) : option.label}
            </span>
          </SelectItem>
        ))}
      </SelectGroup>
    ));
  }

  return (arr as BaseOption<string>[]).map((option) => (
    <SelectItem key={option.value} value={option.value ?? ''} className="h-6">
      <span className="text-foreground-600 text-label-xs font-medium">
        {capitalizeLabel ? capitalize(option.label.toLocaleLowerCase()) : option.label}
      </span>
    </SelectItem>
  ));
};
