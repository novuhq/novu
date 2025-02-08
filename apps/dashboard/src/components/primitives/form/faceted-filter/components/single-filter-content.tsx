import { cn } from '../../../../../utils/ui';
import { Label } from '../../../label';
import { RadioGroup, RadioGroupItem } from '../../../radio-group';
import { useKeyboardNavigation } from '../hooks/use-keyboard-navigation';
import { FilterOption, SizeType } from '../types';
import { BaseFilterContent } from './base-filter-content';

interface SingleFilterContentProps {
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
}

export function SingleFilterContent({
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
}: SingleFilterContentProps) {
  const currentValue = Array.from(selectedValues)[0] || '';
  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation({
    options,
    onSelect,
    initialSelectedValue: currentValue,
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
      <RadioGroup value={currentValue} onValueChange={onSelect} className={cn('flex flex-col gap-1 p-1')}>
        {options.map((option, index) => {
          const isFocused = index === focusedIndex;

          return (
            <div
              key={option.value}
              className={cn(
                'flex items-center space-x-2 rounded-[4px] p-1.5',
                isFocused && 'bg-neutral-50 ring-1 ring-neutral-200'
              )}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => onSelect(option.value)}
            >
              <RadioGroupItem value={option.value} id={option.value} />
              <Label className="text-xs font-medium" htmlFor={option.value}>
                {option.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </BaseFilterContent>
  );
}
