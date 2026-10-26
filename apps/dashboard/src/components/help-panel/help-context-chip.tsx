import type { IconType } from 'react-icons';
import { RiCloseLine } from 'react-icons/ri';

type HelpContextChipProps = {
  icon: IconType;
  label: string;
  onRemove: () => void;
};

export function HelpContextChip({ icon: Icon, label, onRemove }: HelpContextChipProps) {
  return (
    <span className="inline-flex h-5 min-w-0 max-w-full items-center gap-1 rounded-6 border border-stroke-soft bg-bg-white py-0.5 pl-1.5 pr-1 transition-colors hover:border-stroke-sub has-[button:focus-visible]:border-stroke-sub">
      <Icon aria-hidden className="size-3 shrink-0 text-icon-sub" />
      <span className="truncate text-label-2xs text-text-sub" title={label}>
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Don't include ${label} in questions`}
        className="flex size-3 shrink-0 items-center justify-center rounded-4 text-icon-soft outline-none transition-colors hover:text-icon-sub focus-visible:text-icon-sub"
      >
        <RiCloseLine aria-hidden className="size-3" />
      </button>
    </span>
  );
}
