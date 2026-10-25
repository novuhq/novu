'use client';

import { Check, Copy, type LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/** How long a copy button shows its check mark. */
export const COPIED_MS = 2000;

type CopyButtonProps = {
  value: string;
  /** What is being copied, for screen readers: "Copy invite link". */
  label: string;
  /** Visible text next to the icon. Without it the button is icon only. */
  children?: ReactNode;
  variant?: 'ghost' | 'quiet' | 'secondary' | 'primary';
  className?: string;
  /** Size of the icon, when the default 14px doesn't fit. */
  iconClassName?: string;
  /** Leaves the icon out, for a button the design draws with its label alone. The label then says "Copied". */
  labelOnly?: boolean;
  /**
   * Runs once the value is on the clipboard, for a page that keeps track of what was copied. It may save
   * that on the server; a failed save is logged, and copying again tries once more.
   */
  onCopy?: () => void | Promise<void>;
};

/** Copies `value` to the clipboard and shows a check mark for a moment. */
export function CopyButton({
  value,
  label,
  children,
  variant,
  className,
  iconClassName,
  labelOnly = false,
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast("Couldn't copy. Select the text and copy it yourself.", 'error');

      return;
    }

    setCopied(true);

    // The value is on the clipboard either way, so the button still says so when this fails.
    try {
      await onCopy?.();
    } catch (error) {
      console.error('Failed to note the copy', error);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={children ? undefined : label}
      title={children ? undefined : label}
      className={buttonClassName(variant ?? (children ? 'secondary' : 'ghost'), className)}
    >
      {!labelOnly && <CopiedIcon icon={Copy} copied={copied} className={iconClassName ?? 'size-3.5'} />}
      {labelOnly && copied ? 'Copied' : children}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}

/** An icon that fades and scales into a check mark once something was copied, and back again. */
export function CopiedIcon({
  icon: Icon,
  copied,
  className,
}: {
  icon: LucideIcon;
  copied: boolean;
  className?: string;
}) {
  const layer =
    'col-start-1 row-start-1 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none';

  return (
    <span aria-hidden="true" className="inline-grid">
      <Icon className={cn(layer, className, copied && 'scale-50 opacity-0')} />
      <Check className={cn(layer, className, !copied && 'scale-50 opacity-0')} />
    </span>
  );
}
