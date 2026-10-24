'use client';

import Link from 'next/link';

import { HostLogo } from '@/components/connect/host-logo';
import { HostPicker } from '@/components/connect/host-picker';
import { ChatAppSteps, CommandSteps, commandsLead, Divider } from '@/components/connect/host-steps';
import { configureConnectPath } from '@/components/dashboard/nav';
import { Brand } from '@/components/site/brand';
import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import {
  type Host,
  type HostId,
  hostMarkdownPath,
  hostOf,
  hostPath,
  hostSubject,
  hostSummary,
  MCP_URL,
  tellYourAgent,
} from '@/lib/hosts';
import { AGENT_DOMAIN } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/**
 * A host's public page on agentinbox.md (`/claude-code`), for the person setting it up: what to tell their
 * agent, then the same steps as the dashboard's picker, from the same list. Where the dashboard has the
 * one-time code, this page says "sign in to get your code", which opens "Connect another agent" on this host
 * once they're signed in. The other hosts are a click away in the same picker, each a page of its own.
 *
 * Not drawn in the design: it's built from the dashboard's own parts, the prompt box of `4.7`, the steps of
 * `4c.1` and the onboarding's "or from your terminal" divider (`0.3 · Connect`).
 */
export function HostPage({ hostId }: { hostId: HostId }) {
  const host = hostOf(hostId);
  const signInHref = configureConnectPath(host.id);

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip">
      {/* `Deco/Callout dither`, as the onboarding has it in its top right corner. Decoration only. */}
      <img
        src="/illustrations/dither-callout.svg"
        alt=""
        aria-hidden="true"
        width={560}
        height={320}
        className="pointer-events-none absolute -top-15 -right-10 -z-10 h-128 w-224 max-w-none opacity-22 select-none"
      />
      <header className="flex h-16.5 shrink-0 items-center gap-4 px-4 md:px-10">
        <Brand />
        <nav aria-label="Agent Inbox" className="ml-auto flex items-center gap-4">
          <Link
            href="/sapien"
            className="hidden rounded-sm text-[13px] leading-4.5 text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none sm:block"
          >
            What is Agent Inbox?
          </Link>
          <Link href={signInHref} className={buttonClassName('secondary', SMALL_BUTTON)}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-150 flex-1 flex-col gap-8 px-4 pt-4 pb-16 md:pt-8">
        <HostPicker selected={host.id} hrefOf={hostPath} />

        {/* A new host's page rises in under the picker, which stays where it was. */}
        <div key={host.id} className="flex animate-rise-in flex-col gap-8 motion-reduce:animate-none">
          <section className="flex flex-col items-start gap-4">
            <HostLogo host={host} size="large" />
            <h1 className="text-[28px] leading-9 tracking-[-0.8px] text-foreground">
              Agent Inbox for{' '}
              <em className="font-display text-accent">{host.id === 'general' ? 'any agent' : host.name}</em>
            </h1>
            <p className="text-[15px] leading-5.75 text-secondary">{hostSummary(host)}</p>
          </section>

          <TellYourAgent host={host} />

          <Divider>or set it up yourself</Divider>

          <section aria-label="Set it up yourself" className="flex flex-col gap-4.5">
            {host.group === 'commands' ? (
              <>
                <p className="text-[13px] leading-[19px] text-secondary">{commandsLead(host)}</p>
                <CommandSteps
                  host={host}
                  handle=""
                  code={{ status: 'signed-out', signInHref }}
                  mcpUrl={MCP_URL}
                  hideLead
                />
              </>
            ) : (
              <ChatAppSteps host={host} mcpUrl={MCP_URL} />
            )}
          </section>
        </div>
      </main>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4.5 text-xs leading-4 text-muted md:px-10">
        <a
          href="https://novu.co/"
          className="rounded-sm font-mono text-[10px] leading-3.5 font-medium uppercase hover:text-secondary"
        >
          Built on Novu
        </a>
        <p className="ml-auto">
          For agents:{' '}
          <a href={hostMarkdownPath(host.id)} className="rounded-sm font-mono text-default hover:text-foreground">
            {AGENT_DOMAIN}
            {hostMarkdownPath(host.id)}
          </a>
        </p>
        <a href="/llms.txt" className="rounded-sm font-mono text-default hover:text-foreground">
          llms.txt
        </a>
      </footer>
    </div>
  );
}

/**
 * What the page opens with: the line to tell the agent, in a box like the prompt of "Connect another agent"
 * (`4.7`), with the button that copies it.
 */
function TellYourAgent({ host }: { host: Host }) {
  const line = tellYourAgent(host.id);
  const subject = hostSubject(host);

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-strong bg-subtle">
      <div className="flex items-center gap-2.5 bg-raised p-2">
        <p className="rounded-[7px] border border-border-strong/50 bg-background p-0.5">
          <span className="block rounded-[5px] border border-border-strong bg-raised px-2.5 py-0.75 text-xs leading-4 font-medium text-foreground">
            Tell your agent
          </span>
        </p>
        <CopyButton
          value={line}
          label="Copy what to tell your agent"
          variant="primary"
          className={cn(SMALL_BUTTON, 'ml-auto')}
        >
          Copy
        </CopyButton>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="font-mono text-[13px] leading-5 font-medium text-foreground">{line}</p>
        <p className="font-mono text-[11px] leading-3.5 text-muted">{tellYourAgentNote(host, subject)}</p>
      </div>
    </div>
  );
}

/** What the agent does with the line, under it. */
function tellYourAgentNote(host: Host, subject: string): string {
  if (host.group === 'commands') {
    return `Paste it into ${subject}. It reads the steps, sets up the inbox and asks you to approve its login on ${AGENT_DOMAIN}.`;
  }

  return host.addsServerWhenAsked
    ? `Paste it into ${subject}. It adds Agent Inbox itself and asks you to sign in.`
    : `Paste it into ${subject}. It reads the steps and walks you through adding Agent Inbox.`;
}
