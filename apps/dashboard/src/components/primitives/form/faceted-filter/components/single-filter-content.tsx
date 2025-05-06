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
          const isDisabled = option.disabled;

          return (
            <div
              key={option.value}
              className={cn(
                'flex items-center justify-between rounded-[4px] p-1.5',
                isFocused && 'bg-neutral-50 ring-1 ring-neutral-200',
                isDisabled && 'cursor-default'
              )}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => !isDisabled && onSelect(option.value)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={option.value} disabled={isDisabled} />
                <Label
                  className={cn('text-xs font-medium', isDisabled && 'cursor-default')}
                  htmlFor={option.value}
                  disabled={isDisabled}
                >
                  {option.label}
                </Label>
              </div>
              {option.icon && <option.icon />}
            </div>
          );
        })}
      </RadioGroup>
    </BaseFilterContent>
  );
}
