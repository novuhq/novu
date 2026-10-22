'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const COPIED_MS = 1400;

/** The landing page's install line: the command after a `$`, and a "copy" button that says "copied" for a moment. */
export function CopyCommand({ command, className }: { command: string; className?: string }) {
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
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Nothing to copy with (an insecure page, or no permission): the command stays on show to copy by hand.
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-5 border border-foreground/18 bg-subtle px-4.5 py-3.5 font-mono text-[0.86rem] font-normal',
        className
      )}
    >
      <span>
        <span className="text-accent select-none">$</span> {command}
      </span>
      <button
        type="button"
        onClick={copy}
        className="cursor-pointer border-l border-foreground/9 py-1 pl-4.5 font-mono text-[0.66rem] tracking-[0.08em] text-muted uppercase transition-[color] duration-150 ease-[ease] hover:text-foreground"
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}
