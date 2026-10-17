'use client';

import { ArrowRight, Download } from 'lucide-react';
import { useState, useTransition } from 'react';

import { notePromptCopiedAction, skipForNowAction } from '@/app/(account)/onboarding/actions';
import { DOCS_URL } from '@/components/dashboard/nav';
import { ToolChips } from '@/components/onboarding/identity-stage';
import { Eyebrow, StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { toast } from '@/components/ui/toast';
import { connectCommands, connectPrompt, INSTALL_SKILLS_COMMAND, promptText } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

type ConnectStepProps = {
  handle: string;
  address: string;
  /** The one-time code a host connects with. */
  code: string;
  /** Messages already in the inbox, waiting for a host to read them. */
  waiting: number;
};

type Tab = 'prompt' | 'cli';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'prompt', label: 'Prompt' },
  { id: 'cli', label: 'CLI' },
];

/**
 * Step 3: the operator hands the agent to whatever runs it. One prompt to paste into the agent, or the
 * same commands to run by hand. The page moves on by itself once a host has connected.
 */
export function ConnectStep({ handle, address, code, waiting }: ConnectStepProps) {
  const [tab, setTab] = useState<Tab>('prompt');
  const [leaving, startLeaving] = useTransition();
  const prompt = connectPrompt({ handle, address, code });
  const commands = connectCommands({ handle, code });
  const copyValue = tab === 'prompt' ? promptText(prompt) : commands.map(({ command }) => command).join('\n');

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
      <StepLead>
        {/* The sentence that belongs to the tab fades in with it. */}
        <span key={tab} className="animate-overlay-in motion-reduce:animate-none">
          {tab === 'prompt' ? 'Paste this into your agent.' : 'Run these where your agent runs.'}
        </span>{' '}
        It connects as {handle}.
      </StepLead>

      <div className="flex flex-col gap-2">
        <div className="overflow-hidden rounded-[10px] border border-border-strong bg-subtle">
          <div className="flex items-center gap-2.5 bg-raised p-2">
            <div
              role="tablist"
              aria-label="How to connect"
              className="flex gap-0.5 rounded-[7px] border border-border-strong/50 bg-background p-0.5"
            >
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'rounded-[5px] border px-2.5 py-0.75 text-xs leading-4 transition-colors motion-reduce:transition-none',
                    tab === id
                      ? 'border-border-strong bg-raised font-medium text-foreground'
                      : 'border-transparent text-secondary hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <CopyButton
              value={copyValue}
              label={tab === 'prompt' ? 'Copy the prompt' : 'Copy the commands'}
              variant="primary"
              className={cn(SMALL_BUTTON, 'ml-auto')}
              // Nothing waits for this: it only starts the clock of the stand-in host (NV-9037).
              onCopy={() => void notePromptCopiedAction().catch(() => {})}
            >
              {tab === 'prompt' ? 'Copy prompt' : 'Copy commands'}
            </CopyButton>
          </div>
          {/*
            A new key per tab, so its lines fade in. The panel keeps the height of the prompt's ten lines
            for the commands as well: the card, and the tabs under the pointer, stay where they are.
            A line that is too long for the panel goes on in the next one; nothing scrolls sideways.
          */}
          <div key={tab} role="tabpanel" className="animate-overlay-in p-4 motion-reduce:animate-none">
            <pre className="min-h-50 font-mono text-[12.5px] leading-5 wrap-anywhere whitespace-pre-wrap text-default">
              {tab === 'prompt'
                ? prompt.map((line, index) => (
                    // The lines of a prompt never reorder, so where a line stands is its key.
                    <span key={index} className="block min-h-5">
                      {line.map((span) => (
                        <span
                          key={span.text}
                          className={cn(
                            span.tone === 'strong' && 'font-medium text-foreground',
                            span.tone === 'accent' && 'text-accent'
                          )}
                        >
                          {span.text}
                        </span>
                      ))}
                    </span>
                  ))
                : commands.map(({ command }) => (
                    <span key={command} className="block">
                      <span aria-hidden="true" className="font-medium text-accent select-none">
                        ${' '}
                      </span>
                      <span className="font-medium text-foreground">{command}</span>
                    </span>
                  ))}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
          <span>Works with</span>
          <ToolChips className="gap-0 [&>*]:-ml-0.75 [&>*:first-child]:ml-0 [&>*:first-child]:-rotate-3 [&>*:last-child]:rotate-3" />
          <span>and anything that runs a command or MCP</span>
          <button
            type="button"
            onClick={installSkills}
            className={buttonClassName('quiet', cn(SMALL_BUTTON, 'ml-auto'))}
          >
            <Download aria-hidden="true" className="size-3.5" />
            Install skills
          </button>
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

/** Until the skills can be downloaded from here, the button hands over the command that installs them. */
async function installSkills() {
  try {
    await navigator.clipboard.writeText(INSTALL_SKILLS_COMMAND);
    toast(`Copied: ${INSTALL_SKILLS_COMMAND}`);
  } catch {
    toast(`Couldn't copy. The command is: ${INSTALL_SKILLS_COMMAND}`, 'error');
  }
}
