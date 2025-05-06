import { Check } from 'lucide-react';
import { cn } from '../../../../../utils/ui';
import { FilterOption, SizeType } from '../types';
import { BaseFilterContent } from './base-filter-content';
import { useKeyboardNavigation } from '../hooks/use-keyboard-navigation';

type MultiFilterContentProps = {
  inputRef: React.RefObject<HTMLInputElement>;
  title?: string;
  options: FilterOption[];
  selectedValues: Set<string>;
  onSelect: (value: string) => void;
  onClear: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  size: SizeType;
  hideSearch?: boolean;
  hideClear?: boolean;
};

export function MultiFilterContent({
  inputRef,
  title,
  options,
  selectedValues,
  onSelect,
  onClear,
  searchQuery,
  onSearchChange,
  size,
  hideSearch = false,
  hideClear = false,
}: MultiFilterContentProps) {
  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation({
    options,
    onSelect,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <BaseFilterContent
      inputRef={inputRef}
      title={title}
      onClear={onClear}
      size={size}
      hideSearch={hideSearch}
      hideClear={hideClear}
      searchValue={searchQuery}
      onSearchChange={handleSearchChange}
      searchPlaceholder={`Search ${title}...`}
      showNavigationFooter={true}
    >
      <div className={cn('flex flex-col gap-1 p-1')}>
        {options.map((option, index) => {
          const isSelected = selectedValues.has(option.value);
          const isFocused = index === focusedIndex;

          return (
            <div
              key={option.value}
              onClick={() => onSelect(option.value)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={cn(
                'flex cursor-pointer items-center rounded-[6px] p-1 hover:bg-[#F8F8F8]',
                isSelected && 'bg-[#F8F8F8]',
                isFocused && 'ring-1 ring-neutral-200'
              )}
            >
              {option.icon && <option.icon className="mr-2 h-4 w-4 text-[#737373]" />}
              <span className="text-xs font-normal text-[#404040]">{option.label}</span>
              {isSelected && (
                <div className={'ml-auto'}>
                  <Check className="h-2.5 w-2.5 text-neutral-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BaseFilterContent>
  );
}
