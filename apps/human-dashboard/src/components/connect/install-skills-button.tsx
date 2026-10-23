'use client';

import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopiedIcon } from '@/components/ui/copy-button';
import { toast } from '@/components/ui/toast';
import { INSTALL_SKILLS_COMMAND } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const COPIED_MS = 2000;

type InstallSkillsButtonProps = {
  /** `secondary` in "Connect another agent", `quiet` on the onboarding's connect step. */
  variant?: 'secondary' | 'quiet';
  className?: string;
};

/**
 * "Install skills": copies the command that installs the agent-inbox skill (`skill install`), which the
 * operator runs in the project their coding agent works in. The icon turns into a check mark for a moment
 * once it's on the clipboard, and a toast says what was copied and where to run it.
 */
export function InstallSkillsButton({ variant = 'secondary', className }: InstallSkillsButtonProps) {
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
      toast(`Copied: ${INSTALL_SKILLS_COMMAND}`, 'success', 'Run it in the project your agent works in.');
    } catch {
      toast(`Couldn't copy. The command is: ${INSTALL_SKILLS_COMMAND}`, 'error');
    }
  }

  return (
    <button type="button" onClick={install} className={buttonClassName(variant, cn(SMALL_BUTTON, className))}>
      <CopiedIcon icon={Download} copied={copied} className="size-3.5" />
      Install skills
    </button>
  );
}
