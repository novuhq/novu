'use client';

import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopiedIcon } from '@/components/ui/copy-button';
import { toast } from '@/components/ui/toast';
import { INSTALL_SKILLS_COMMAND } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const COPIED_MS = 2000;

/**
 * "Install skills": until the skills can be downloaded from here, the button hands over the command that
 * installs them, and its icon turns into a check mark for a moment once it's on the clipboard.
 */
export function InstallSkillsButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  async function install() {
    try {
      await navigator.clipboard.writeText(INSTALL_SKILLS_COMMAND);
      setCopied(true);
      toast(`Copied: ${INSTALL_SKILLS_COMMAND}`);
    } catch {
      toast(`Couldn't copy. The command is: ${INSTALL_SKILLS_COMMAND}`, 'error');
    }
  }

  return (
    <button type="button" onClick={install} className={buttonClassName('secondary', cn(SMALL_BUTTON, className))}>
      <CopiedIcon icon={Download} copied={copied} className="size-3.5" />
      Install skills
    </button>
  );
}
