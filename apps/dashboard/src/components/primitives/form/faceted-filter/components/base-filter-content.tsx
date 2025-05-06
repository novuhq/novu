import { RiArrowDownLine, RiArrowUpLine } from 'react-icons/ri';
import { EnterLineIcon } from '../../../../icons/enter-line';
import { Separator } from '../../../separator';
import { SizeType } from '../types';
import { ClearButton } from './clear-button';
import { FilterInput } from './filter-input';

interface BaseFilterContentProps {
  inputRef: React.RefObject<HTMLInputElement>;
  title?: string;
  onClear: () => void;
  size: SizeType;
  hideSearch?: boolean;
  hideClear?: boolean;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder?: string;
  showNavigationFooter?: boolean;
  showEnterIcon?: boolean;
  children?: React.ReactNode;
}

export function BaseFilterContent({
  inputRef,
  title,
  onClear,
  size,
  hideSearch = false,
  hideClear = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  showNavigationFooter = false,
  showEnterIcon = false,
  children,
}: BaseFilterContentProps) {
  return (
    <div className="flex h-full flex-col">
      <Separator variant="solid-text" className="px-1.5 py-1">
        <div className="flex w-full justify-between rounded-t-md bg-neutral-50">
          {title && <div className="uppercase leading-[16px]">{title}</div>}
          {!hideClear && <ClearButton onClick={onClear} size={size} className="h-[16px]" label="Reset" />}
        </div>
      </Separator>

      {!hideSearch && onSearchChange && (
        <FilterInput
          inputRef={inputRef}
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          size={size}
          showEnterIcon={showEnterIcon}
        />
      )}

      <div className="max-h-[160px] overflow-y-auto">{children}</div>

      {showNavigationFooter && (
        <div className="flex justify-between rounded-b-md border-t border-neutral-100 bg-white p-1">
          <div className="flex items-center gap-0.5">
            <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
              <RiArrowUpLine className="h-3 w-3 text-neutral-400" />
            </div>
            <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
              <RiArrowDownLine className="h-3 w-3 text-neutral-400" />
            </div>
            <span className="text-foreground-500 ml-1.5 text-xs font-normal">Navigate</span>
          </div>
          <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
            <EnterLineIcon className="h-3 w-3 text-neutral-400" />
          </div>
        </div>
      )}
    </div>
  );
}
