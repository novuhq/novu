import { RiKey2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';

/**
 * Matched to the inputs the field sits next to, so a saved secret lines up with the rest of the form.
 * Replace is a step shorter than the field, as in the design.
 */
const SIZES = {
  md: { field: 'h-10 gap-2 rounded-10 px-3', value: 'text-label-sm', button: 'h-9 rounded-lg px-2.5 text-label-xs' },
  '2xs': { field: 'h-7 gap-1.5 rounded-lg px-2', value: 'text-label-xs', button: 'h-6 rounded-md px-2 text-label-xs' },
} as const;

/**
 * A secret that is already saved. The API only returns a mask of it, so it can be replaced but not read;
 * the stored value stays in use until a new one is saved.
 */
export function SavedSecretField({
  id,
  label,
  maskedValue,
  onReplace,
  isReadOnly,
  size = 'md',
}: {
  id?: string;
  label: string;
  maskedValue: string;
  onReplace: () => void;
  isReadOnly?: boolean;
  size?: keyof typeof SIZES;
}) {
  const sizes = SIZES[size];

  return (
    <div className="flex items-center gap-1.5">
      <div
        id={id}
        className={cn(
          'border-stroke-soft bg-bg-weak shadow-xs flex min-w-0 flex-1 items-center overflow-hidden border',
          sizes.field
        )}
      >
        <RiKey2Line className="text-text-sub size-4 shrink-0" aria-hidden />
        <span className={cn('text-text-sub truncate', sizes.value)}>{maskedValue}</span>
      </div>
      {!isReadOnly && (
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          size="2xs"
          className={sizes.button}
          aria-label={`Replace ${label.toLowerCase()}`}
          onClick={onReplace}
        >
          Replace
        </Button>
      )}
    </div>
  );
}
