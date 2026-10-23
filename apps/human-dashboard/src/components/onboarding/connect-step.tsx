'use client';

import { ArrowRight } from 'lucide-react';
import { useCallback, useTransition } from 'react';

import { createOnboardingConnectCodeAction, skipForNowAction } from '@/app/(account)/onboarding/actions';
import { ConnectPromptBox } from '@/components/connect/connect-prompt-box';
import { InstallSkillsButton } from '@/components/connect/install-skills-button';
import { DOCS_URL } from '@/components/dashboard/nav';
import { ToolChips } from '@/components/onboarding/identity-stage';
import { Eyebrow, StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useConnectCode } from '@/hooks/use-connect-code';
import type { AiTool } from '@/lib/ai-tools';
import { cn } from '@/lib/utils';

type ConnectStepProps = {
  handle: string;
  /** The API the account lives on, named by the connect command. */
  apiUrl: string;
  /** Messages already in the inbox, waiting for a host to read them. */
  waiting: number;
  /** Opens a chat app's MCP drawer, from its logo. Left out while there is no MCP server. */
  onOpenTool?: (tool: AiTool) => void;
};

/**
 * Step 3: the operator hands the agent to whatever runs it: the commands to run in their terminal, or a
 * chat app's MCP drawer, from its logo under them. The page moves on by itself once a host has connected.
 */
export function ConnectStep({ handle, apiUrl, waiting, onOpenTool }: ConnectStepProps) {
  const [leaving, startLeaving] = useTransition();
  const createCode = useCallback(() => createOnboardingConnectCodeAction(handle), [handle]);
  const { state: code, retry } = useConnectCode(createCode, true);

  return (
    <>
      <Eyebrow tone="accent">
        {waiting > 0
          ? `${waiting} ${waiting === 1 ? 'message is' : 'messages are'} waiting for your agent`
          : 'Waiting for your agent'}
      </Eyebrow>
      <StepTitle>
        Hand {handle} to <em>your agent</em>
      </StepTitle>
      <StepLead>Run these in your terminal, in the project your agent works in. It connects as {handle}.</StepLead>

      <div className="flex flex-col gap-2">
        <ConnectPromptBox handle={handle} apiUrl={apiUrl} code={code} onRetry={retry} />

        <TooltipProvider delayDuration={300}>
          <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
            <span>Works with</span>
            <ToolChips
              onOpen={onOpenTool}
              className="gap-0 [&>*]:-ml-0.75 [&>*:first-child]:ml-0 [&>*:first-child]:-rotate-3 [&>*:last-child]:rotate-3"
            />
            <span>and anything that runs a command or MCP</span>
            <InstallSkillsButton variant="quiet" className="ml-auto" />
          </div>
        </TooltipProvider>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-4 text-default transition-opacity duration-200 motion-reduce:transition-none',
          leaving && 'pointer-events-none opacity-60'
        )}
      >
        <button
          type="button"
          // The connectors live on Configure, outside the steps: leaving for it is skipping for now.
          onClick={() => startLeaving(() => skipForNowAction('configure'))}
          className="flex items-center gap-1 rounded-sm hover:text-foreground"
        >
          ChatGPT or Claude in the browser? Add a connector
          <ArrowRight aria-hidden="true" className="size-3" strokeWidth={1.5} />
        </button>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-sm hover:text-foreground"
        >
          Building your own? SDK and API
          <ArrowRight aria-hidden="true" className="size-3" strokeWidth={1.5} />
        </a>
      </div>
    </>
  );
}
