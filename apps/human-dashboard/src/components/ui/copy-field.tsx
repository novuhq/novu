import type { ReactNode } from 'react';

import { SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type CopyFieldProps = {
  /** The text that gets copied. */
  value: string;
  /** What is being copied, for screen readers: "Copy API key". */
  label: string;
  /** Shown instead of `value`, for example a masked key. */
  display?: ReactNode;
  /** Adds the terminal prompt in front, for commands. */
  command?: boolean;
  /** Text on the copy button, which makes the field taller around it. Without it the button is icon only. */
  action?: string;
  className?: string;
};

/** A read-only mono value with a copy button: an address, a link, a key or a terminal command. */
export function CopyField({ value, label, display, command = false, action, className }: CopyFieldProps) {
  return (
    <div
      className={cn(
        'flex min-h-9 items-center gap-2.5 rounded-md bg-background pl-3 ring-1 ring-border ring-inset',
        action ? 'py-2 pr-2' : 'py-0.5 pr-0.5',
        className
      )}
    >
      {command && (
        <span aria-hidden="true" className="font-mono text-[13px] leading-5 font-medium text-accent select-none">
          $
        </span>
      )}
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] leading-5 text-default">{display ?? value}</code>
      <CopyButton value={value} label={label} className={action ? SMALL_BUTTON : undefined}>
        {action}
      </CopyButton>
    </div>
  );
}
