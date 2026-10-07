'use client';

import { Check, Copy, type LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const COPIED_MS = 2000;

type CopyButtonProps = {
  value: string;
  /** What is being copied, for screen readers: "Copy invite link". */
  label: string;
  /** Visible text next to the icon. Without it the button is icon only. */
  children?: ReactNode;
  variant?: 'ghost' | 'secondary' | 'primary';
  className?: string;
};

/** Copies `value` to the clipboard and shows a check mark for a moment. */
export function CopyButton({ value, label, children, variant, className }: CopyButtonProps) {
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
      setCopied(true);
    } catch {
      toast("Couldn't copy. Select the text and copy it yourself.", 'error');
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
      <CopiedIcon icon={Copy} copied={copied} className="size-3.5" />
      {children}
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
