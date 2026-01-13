import { cn } from '../../../../../utils/ui';
import { EnterLineIcon } from '../../../../icons/enter-line';
import { InputPure } from '../../../input';
import { STYLES } from '../styles';
import { SizeType } from '../types';

interface FilterInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  size: SizeType;
  showEnterIcon?: boolean;
}

export function FilterInput({ inputRef, value, onChange, placeholder, size, showEnterIcon = false }: FilterInputProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <InputPure
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'w-full border-none! shadow-none! ring-0!',
          STYLES.size[size].input,
          STYLES.input.base,
          STYLES.input.text
        )}
      />
      {showEnterIcon && (
        <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 p-0.5">
          <EnterLineIcon className="h-3 w-3 text-neutral-200" />
        </div>
      )}
    </div>
  );
}
