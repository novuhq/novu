'use client';

import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

export type CopyButtonProps = {
  text: string;
  children: string;
  copiedLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
};
export function CopyButton({
  text,
  children,
  copiedLabel = 'Copied',
  successMessage = 'Copied to clipboard',
  errorMessage = "Couldn't copy. Select the text and copy it manually.",
  className,
}: CopyButtonProps) {
  const { state, copy } = useClipboard(text);
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-disabled={state === 'pending'}
        aria-busy={state === 'pending'}
        className={cn('cursor-pointer transition-colors duration-150 motion-reduce:transition-none', className)}
      >
        {state === 'success' ? copiedLabel : children}
      </button>
      {/* biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a copy notice */}
      <p
        role="status"
        aria-live="polite"
        className={state === 'error' ? 'mt-2 text-sm text-sapien-foreground/70' : 'sr-only'}
      >
        {state === 'error' ? errorMessage : state === 'success' ? successMessage : ''}
      </p>
    </>
  );
}
