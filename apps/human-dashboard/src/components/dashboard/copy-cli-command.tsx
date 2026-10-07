'use client';

import { Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { CopiedIcon } from '@/components/ui/copy-button';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';

const COPIED_MS = 2000;

/** The terminal button in a page header: copies the CLI command that does what the page does. */
export function CopyCliCommand({ command }: { command: string }) {
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
      toast(`Copied: ${command}`);
    } catch {
      toast(`Couldn't copy. The command is: ${command}`, 'error');
    }
  }

  return (
    <Tooltip label="Copy CLI command">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy CLI command"
        className={buttonClassName('secondary', 'size-8 px-0 text-foreground')}
      >
        <CopiedIcon icon={Terminal} copied={copied} className="size-4" />
        <span aria-live="polite" className="sr-only">
          {copied ? 'Copied' : ''}
        </span>
      </button>
    </Tooltip>
  );
}
