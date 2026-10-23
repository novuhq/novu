'use client';

import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

export type CopyCommandProps = {
  command: string;
  label: string;
  /** "default" shows a labelled Copy button; "icon" shows an icon-only copy button. */
  variant?: 'default' | 'icon';
  className?: string;
};
export function CopyCommand({ command, label, variant = 'default', className = '' }: CopyCommandProps) {
  const { state, copy } = useClipboard(command);
  const icon = variant === 'icon';
  // Below 360px the 15px command no longer fits beside the icon button, so it
  // drops to 14px instead of wrapping "setup" onto a second line.
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset is for form controls, this names a command and its copy button
    <div role="group" aria-label={label} className={className}>
      <div
        className={cn(
          'flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-accent/40 bg-black py-px pl-[11px]',
          icon ? 'pr-0.5' : 'pr-px'
        )}
      >
        <span
          aria-hidden="true"
          className="-translate-y-px font-sapien-mono text-[15px] text-accent max-[359px]:text-sm"
        >
          $
        </span>
        <code className="min-w-0 flex-1 -translate-y-px font-sapien-mono text-[15px] tracking-tight [overflow-wrap:anywhere] whitespace-normal select-text max-[359px]:text-sm">
          {command}
        </code>
        {icon ? (
          <button
            type="button"
            onClick={copy}
            aria-label="Copy command"
            aria-disabled={state === 'pending'}
            aria-busy={state === 'pending'}
            className="-ml-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-accent transition-colors duration-150 hover:bg-accent/10 motion-reduce:transition-none"
          >
            {state === 'success' ? <CheckIcon /> : <CopyIcon />}
          </button>
        ) : (
          <button
            type="button"
            onClick={copy}
            aria-disabled={state === 'pending'}
            aria-busy={state === 'pending'}
            className="h-9 w-[75px] shrink-0 cursor-pointer rounded-md bg-accent text-[15px] font-medium tracking-tight text-black transition-colors duration-150 hover:bg-accent/90 motion-reduce:transition-none"
          >
            {state === 'success' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a copy notice */}
      <p
        role="status"
        aria-live="polite"
        className={state === 'error' ? 'mt-2 text-sm text-sapien-foreground/70' : 'sr-only'}
      >
        {state === 'error'
          ? "Couldn't copy. Select the command and copy it manually."
          : state === 'success'
            ? 'Command copied to clipboard'
            : ''}
      </p>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.25 12.75H3.375C2.754 12.75 2.25 12.246 2.25 11.625V3.375C2.25 2.754 2.754 2.25 3.375 2.25H11.625C12.246 2.25 12.75 2.754 12.75 3.375V5.25" />
      <path d="M14.625 5.25H6.375C5.754 5.25 5.25 5.754 5.25 6.375V14.625C5.25 15.246 5.754 15.75 6.375 15.75H14.625C15.246 15.75 15.75 15.246 15.75 14.625V6.375C15.75 5.754 15.246 5.25 14.625 5.25Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 9.375 7.125 12.75 14.25 5.25" />
    </svg>
  );
}
