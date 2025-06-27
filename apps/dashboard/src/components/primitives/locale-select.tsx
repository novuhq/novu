import { locales } from '@/utils/locales';
import { cn } from '@/utils/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine } from 'react-icons/ri';
import { Button, ButtonProps } from './button';
import { Input } from './input';
import { FlagCircle } from '../flag-circle';
import TruncatedText from '../truncated-text';

type LocaleSelectProps = Omit<ButtonProps, 'onChange'> & {
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: string) => void;
  placeholder?: string;
  availableLocales?: string[];
};

// Get most common locales for better performance
const COMMON_LOCALES = [
  'en_US',
  'en_GB',
  'es_ES',
  'fr_FR',
  'de_DE',
  'it_IT',
  'pt_PT',
  'ru_RU',
  'zh_CN',
  'zh_TW',
  'ja_JP',
  'ko_KR',
  'ar_SA',
  'hi_IN',
  'nl_NL',
  'sv_SE',
  'da_DK',
  'no_NO',
  'fi_FI',
  'pl_PL',
  'tr_TR',
  'cs_CZ',
  'hu_HU',
  'ro_RO',
];

export function LocaleSelect(props: LocaleSelectProps) {
  const {
    value,
    disabled,
    readOnly,
    onChange,
    className,
    placeholder = 'Select locale',
    availableLocales,
    ...rest
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentLocale = locales.find((locale) => locale.langIso === value);

  // Get the base locales list - either all locales or filtered by availableLocales
  const baseLocales = useMemo(() => {
    if (availableLocales && availableLocales.length > 0) {
      return locales.filter((locale) => availableLocales.includes(locale.langIso));
    }

    return locales;
  }, [availableLocales]);

  // Optimize locale filtering with memoization
  const filteredLocales = useMemo(() => {
    if (!searchValue.trim()) {
      // If we have availableLocales, show them in order, otherwise show common locales first
      if (availableLocales && availableLocales.length > 0) {
        return baseLocales.slice(0, 100);
      }

      // Show common locales first, then others
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

  const handleSelect = (localeValue: string) => {
    onChange(localeValue);
    setIsOpen(false);
    setSearchValue('');
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

        // If there's not enough space on the right but enough on the left, position left
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
      // Focus the search input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchValue('');
    }
  };

  const showSearchLimitMessage =
    searchValue &&
    baseLocales.filter(
      (locale) =>
        locale.langIso.toLowerCase().includes(searchValue.toLowerCase()) ||
        locale.langName.toLowerCase().includes(searchValue.toLowerCase()) ||
        locale.name.toLowerCase().includes(searchValue.toLowerCase())
    ).length > 100;

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

          <RiArrowDownSLine
            className={cn('ml-auto size-4 opacity-50', disabled || readOnly ? 'hidden' : 'opacity-100')}
          />
        </div>
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
                  const isSelected = locale.langIso === value;

                  return (
                    <button
                      key={locale.langIso}
                      type="button"
                      className={cn(
                        'hover:bg-accent focus:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus:outline-none',
                        isSelected && 'bg-accent'
                      )}
                      onClick={() => handleSelect(locale.langIso)}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
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
