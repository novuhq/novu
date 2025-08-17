import { getAllLocales, getCommonLocales, getLocaleByIso } from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { FlagCircle, StackedFlagCircles } from '../flag-circle';
import TruncatedText from '../truncated-text';
import { Button, ButtonProps } from './button';
import { Input } from './input';

type BaseLocaleSelectProps = {
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  availableLocales?: string[];
  className?: string;
} & Omit<ButtonProps, 'onChange'>;

type SingleSelectProps = BaseLocaleSelectProps & {
  value?: string;
  onChange: (val: string) => void;
  multiSelect?: false;
};

type MultiSelectProps = BaseLocaleSelectProps & {
  value?: string[];
  onChange: (val: string[]) => void;
  multiSelect: true;
};

type LocaleSelectProps = SingleSelectProps | MultiSelectProps;

// Get most common locales for better performance from centralized registry
const COMMON_LOCALES = getCommonLocales();

// Shared hook for locale filtering logic
function useLocaleFiltering(availableLocales?: string[], searchValue: string = '') {
  const allLocales = getAllLocales();

  const baseLocales = useMemo(() => {
    if (availableLocales && availableLocales.length > 0) {
      return allLocales.filter((locale) => availableLocales.includes(locale.langIso));
    }

    return allLocales;
  }, [availableLocales, allLocales]);

  const filteredLocales = useMemo(() => {
    if (!searchValue.trim()) {
      if (availableLocales && availableLocales.length > 0) {
        return baseLocales.slice(0, 100);
      }

      const common = baseLocales.filter((locale) => COMMON_LOCALES.includes(locale.langIso));
      const others = baseLocales.filter((locale) => !COMMON_LOCALES.includes(locale.langIso));
      return [...common, ...others].slice(0, 100);
    }

    const search = searchValue.toLowerCase();
    return baseLocales
      .filter(
        (locale) =>
          locale.langIso.toLowerCase().includes(search) ||
          locale.langName.toLowerCase().includes(search) ||
          locale.name.toLowerCase().includes(search)
      )
      .slice(0, 100);
  }, [searchValue, baseLocales, availableLocales]);

  const showSearchLimitMessage =
    searchValue &&
    baseLocales.filter(
      (locale) =>
        locale.langIso.toLowerCase().includes(searchValue.toLowerCase()) ||
        locale.langName.toLowerCase().includes(searchValue.toLowerCase()) ||
        locale.name.toLowerCase().includes(searchValue.toLowerCase())
    ).length > 100;

  return { filteredLocales, showSearchLimitMessage };
}

// Single select trigger content
function SingleSelectTrigger({ value, placeholder }: { value?: string; placeholder: string }) {
  const currentLocale = getLocaleByIso(value || '');

  return (
    <div className="flex max-w-full flex-1 items-center gap-2 overflow-hidden">
      {value && <FlagCircle locale={value} size="sm" />}
      <span className="text-xs font-normal text-neutral-950">
        {currentLocale ? (
          <TruncatedText>
            {currentLocale.langIso} - {currentLocale.langName}
          </TruncatedText>
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
      </span>
    </div>
  );
}

// Multi select trigger content
function MultiSelectTrigger({ value, placeholder }: { value?: string[]; placeholder: string }) {
  const allLocales = getAllLocales();
  const selectedLocales = value ? allLocales.filter((locale) => value.includes(locale.langIso)) : [];

  if (selectedLocales.length === 0) {
    return <span className="text-xs font-normal text-neutral-400">{placeholder}</span>;
  }

  if (selectedLocales.length <= 4) {
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        {selectedLocales.map((locale, index) => (
          <div key={locale.langIso} className="flex shrink-0 items-center gap-1">
            <FlagCircle locale={locale.langIso} size="sm" />
            <span className="text-xs font-normal text-neutral-950">{locale.langIso}</span>
            {index < selectedLocales.length - 1 && <span className="text-neutral-400">•</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <StackedFlagCircles locales={selectedLocales.map((locale) => locale.langIso)} maxVisible={10} size="md" />
      <span className="text-xs font-normal text-neutral-950">{selectedLocales.length} locales selected</span>
    </div>
  );
}

export function LocaleSelect(props: LocaleSelectProps) {
  const {
    value,
    disabled,
    readOnly,
    onChange,
    className,
    placeholder = 'Select locale',
    availableLocales,
    multiSelect = false,
    ...rest
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { filteredLocales, showSearchLimitMessage } = useLocaleFiltering(availableLocales, searchValue);

  const handleSelect = (localeValue: string) => {
    if (multiSelect && Array.isArray(value)) {
      const newValue = value.includes(localeValue) ? value.filter((v) => v !== localeValue) : [...value, localeValue];
      (onChange as (val: string[]) => void)(newValue);
      // Don't close for multi-select
    } else {
      (onChange as (val: string) => void)(localeValue);
      setIsOpen(false);
      setSearchValue('');
    }
  };

  const handleToggle = () => {
    if (!disabled && !readOnly) {
      // Calculate dropdown position based on available space
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 320;
        const spaceOnRight = viewportWidth - rect.right;
        const spaceOnLeft = rect.left;

        if (spaceOnRight < dropdownWidth && spaceOnLeft >= dropdownWidth) {
          setDropdownPosition('right');
        } else {
          setDropdownPosition('left');
        }
      }

      setIsOpen(!isOpen);
    }
  };

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchValue('');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        mode="outline"
        className={cn('flex h-8 w-full items-center justify-between gap-1 rounded-lg px-3 focus:z-10', className)}
        disabled={disabled || readOnly}
        onClick={handleToggle}
        type="button"
        {...rest}
      >
        {multiSelect ? (
          <MultiSelectTrigger value={value as string[]} placeholder={placeholder} />
        ) : (
          <SingleSelectTrigger value={value as string} placeholder={placeholder} />
        )}

        <RiArrowDownSLine
          className={cn('ml-auto size-4 opacity-50', disabled || readOnly ? 'hidden' : 'opacity-100')}
        />
      </Button>

      {isOpen && (
        <div
          className={cn(
            'border-border bg-background absolute z-[9999] mt-1 w-full min-w-[320px] rounded-lg border shadow-lg',
            dropdownPosition === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="border-border border-b p-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search locales..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              size="xs"
            />
          </div>

          <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1" style={{ scrollBehavior: 'smooth' }}>
            {filteredLocales.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">No locales found.</div>
            ) : (
              <>
                {filteredLocales.map((locale) => {
                  const isSelected = multiSelect
                    ? (value as string[])?.includes(locale.langIso)
                    : locale.langIso === value;

                  return (
                    <button
                      key={locale.langIso}
                      type="button"
                      className={cn(
                        'hover:bg-accent focus:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus:outline-none',
                        isSelected && 'bg-accent'
                      )}
                      onClick={() => handleSelect(locale.langIso)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <FlagCircle locale={locale.langIso} size="sm" className="shrink-0" />
                      <div className="flex-1 overflow-hidden text-left">
                        <TruncatedText>
                          <span className="font-medium">{locale.langIso}</span>
                          <span className="text-muted-foreground"> - {locale.langName}</span>
                        </TruncatedText>
                      </div>
                      <RiCheckLine className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                    </button>
                  );
                })}
                {showSearchLimitMessage && (
                  <div className="text-muted-foreground py-2 text-center text-xs">
                    Showing first 100 results. Continue typing to narrow down.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
