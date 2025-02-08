import { PlusCircle } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../../../utils/ui';
import { Button } from '../../button';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover';
import { FilterBadge } from './components/filter-badge';
import { MultiFilterContent } from './components/multi-filter-content';
import { SingleFilterContent } from './components/single-filter-content';
import { TextFilterContent } from './components/text-filter-content';
import { STYLES } from './styles';
import { FacetedFilterProps } from './types';

export function FacetedFormFilter({
  title,
  type = 'multi',
  size = 'default',
  options = [],
  selected = [],
  onSelect,
  value = '',
  onChange,
  placeholder,
  open,
  onOpenChange,
  icon: Icon,
  hideTitle = false,
  hideSearch = false,
  hideClear = false,
}: FacetedFilterProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedValues = React.useMemo(() => new Set(selected), [selected]);
  const currentValue = React.useMemo(() => value, [value]);
  const sizes = STYLES.size[size];

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchQuery]);

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (selectedValue: string) => {
    if (type === 'single') {
      onSelect?.([selectedValue]);
      return;
    }

    const newSelectedValues = new Set(selectedValues);
    if (newSelectedValues.has(selectedValue)) {
      newSelectedValues.delete(selectedValue);
    } else {
      newSelectedValues.add(selectedValue);
    }

    onSelect?.(Array.from(newSelectedValues));
  };

  const handleClear = () => {
    if (type === 'text') {
      onChange?.('');
    } else {
      onSelect?.([]);
    }
    setSearchQuery('');
  };

  const renderTriggerContent = () => {
    if (type === 'text' && currentValue) {
      return <FilterBadge content={currentValue} size={size} />;
    }

    if (selectedValues.size === 0) return null;

    const selectedCount = selectedValues.size;
    const selectedItems = options.filter((option) => selectedValues.has(option.value));

    return (
      <>
        <div className="lg:hidden">
          <FilterBadge content={selectedCount} size={size} />
        </div>
        <div className="hidden space-x-1 lg:flex">
          {selectedCount > 2 && type === 'multi' ? (
            <FilterBadge content={`${selectedCount} selected`} size={size} />
          ) : (
            selectedItems.map((option) => <FilterBadge key={option.value} content={option.label} size={size} />)
          )}
        </div>
      </>
    );
  };

  const isEmpty = type === 'text' ? !currentValue : selectedValues.size === 0;

  const shouldShowClear = React.useMemo(() => {
    if (hideClear) return false;
    if (type === 'text') return Boolean(currentValue);
    if (type === 'multi' || type === 'single') return !isEmpty;

    return false;
  }, [hideClear, type, currentValue, isEmpty]);

  const renderContent = () => {
    const commonProps = {
      inputRef,
      title,
      size,
      onClear: handleClear,
      hideSearch,
      hideClear: !shouldShowClear,
    };

    if (type === 'text') {
      return (
        <TextFilterContent
          {...commonProps}
          value={currentValue}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
      );
    }

    const filterProps = {
      ...commonProps,
      options: filteredOptions,
      selectedValues,
      onSelect: handleSelect,
      searchQuery,
      onSearchChange: (value: string) => setSearchQuery(value),
    };

    return type === 'single' ? <SingleFilterContent {...filterProps} /> : <MultiFilterContent {...filterProps} />;
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          mode="outline"
          size="sm"
          className={cn(
            'h-10 border-neutral-300 bg-white px-3 text-neutral-600',
            'hover:border-neutral-300 hover:bg-neutral-50/30 hover:text-neutral-700',
            'rounded-lg border-neutral-200 ring-0 ring-offset-0 transition-colors duration-200 ease-out',
            sizes.trigger,
            isEmpty && 'border-[1px] border-dashed px-1.5 hover:border-neutral-300',
            !isEmpty && 'border-[1px] bg-white'
          )}
        >
          <div className="flex items-center gap-1">
            {Icon && <Icon className="h-4 w-4 text-neutral-600" />}
            {isEmpty && <PlusCircle className="h-4 w-4 text-neutral-300" />}
            {(isEmpty || !hideTitle) && (
              <span className={cn('text-xs font-normal', isEmpty ? 'text-neutral-400' : 'text-neutral-600')}>
                {title}
              </span>
            )}
            {!isEmpty && renderTriggerContent()}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[245px] p-0" align="start">
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
}

export * from './types';
