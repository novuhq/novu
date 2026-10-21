'use client';

import { ArrowRight } from 'lucide-react';
import { useCallback, useTransition } from 'react';

import { createOnboardingConnectCodeAction, skipForNowAction } from '@/app/(account)/onboarding/actions';
import { ConnectPromptBox } from '@/components/connect/connect-prompt-box';
import { InstallSkillsButton } from '@/components/connect/install-skills-button';
import { DOCS_URL } from '@/components/dashboard/nav';
import { ToolChips } from '@/components/onboarding/identity-stage';
import { Eyebrow, StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { useConnectCode } from '@/hooks/use-connect-code';
import { cn } from '@/lib/utils';

type ConnectStepProps = {
  handle: string;
  address: string;
  /** The API the account lives on, named by the connect command. */
  apiUrl: string;
  /** Messages already in the inbox, waiting for a host to read them. */
  waiting: number;
};

/**
 * Step 3: the operator hands the agent to whatever runs it. One prompt to paste into the agent, or the
 * same commands to run by hand. The page moves on by itself once a host has connected.
 */
export function ConnectStep({ handle, address, apiUrl, waiting }: ConnectStepProps) {
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
      <StepLead>Paste this into your agent, or run the commands where it runs. It connects as {handle}.</StepLead>

      <div className="flex flex-col gap-2">
        <ConnectPromptBox handle={handle} address={address} apiUrl={apiUrl} code={code} onRetry={retry} />

        <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
          <span>Works with</span>
          <ToolChips className="gap-0 [&>*]:-ml-0.75 [&>*:first-child]:ml-0 [&>*:first-child]:-rotate-3 [&>*:last-child]:rotate-3" />
          <span>and anything that runs a command or MCP</span>
          <InstallSkillsButton variant="quiet" className="ml-auto" />
        </div>
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
