import { SizeType } from '../types';
import { BaseFilterContent } from './base-filter-content';

interface TextFilterContentProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  placeholder?: string;
  size: SizeType;
  hideSearch?: boolean;
  hideClear?: boolean;
  title?: string;
}

export function TextFilterContent({
  inputRef,
  value,
  onChange,
  onClear,
  placeholder,
  size,
  hideSearch = false,
  hideClear = false,
  title,
}: TextFilterContentProps) {
  return (
    <BaseFilterContent
      inputRef={inputRef}
      title={title}
      onClear={onClear}
      size={size}
      hideSearch={hideSearch}
      hideClear={hideClear}
      searchValue={value}
      onSearchChange={onChange}
      searchPlaceholder={placeholder}
      showNavigationFooter={false}
      showEnterIcon={true}
    />
  );
}
