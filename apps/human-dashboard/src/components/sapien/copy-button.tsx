'use client';

import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

export type CopyButtonProps = {
  text: string;
  children: string;
  copiedLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  /** When copying fails, also show `text` to select by hand: for text the page doesn't show, such as a prompt. */
  showTextOnError?: boolean;
  className?: string;
};
export function CopyButton({
  text,
  children,
  copiedLabel = 'Copied',
  successMessage = 'Copied to clipboard',
  errorMessage = "Couldn't copy. Select the text and copy it manually.",
  showTextOnError = false,
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
        // Takes its row's whole width without widening it: under a row of buttons, it wraps onto a line of its own.
        className={state === 'error' ? 'mt-2 w-0 min-w-full text-sm text-sapien-foreground/70' : 'sr-only'}
      >
        {state === 'error' ? errorMessage : state === 'success' ? successMessage : ''}
        {/* Opaque and above its neighbours: in the hero it lies over the illustration. */}
        {state === 'error' && showTextOnError ? (
          <span className="relative z-20 mt-2 block rounded-md border border-border bg-sapien-background p-3 text-left font-mono text-sapien-foreground select-all">
            {text}
          </span>
        ) : null}
      </p>
    </>
  );
}
