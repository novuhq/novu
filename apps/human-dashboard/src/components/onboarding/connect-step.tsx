'use client';

import { ArrowRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { createOnboardingConnectCodeAction } from '@/app/(account)/onboarding/actions';
import { HostPicker } from '@/components/connect/host-picker';
import { HostPanel, hostLead } from '@/components/connect/host-steps';
import { DOCS_URL } from '@/components/dashboard/nav';
import { Eyebrow, StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { useConnectCode } from '@/hooks/use-connect-code';
import type { ConnectApi } from '@/lib/host-status';
import { DEFAULT_HOST, type HostId, hostOf } from '@/lib/hosts';

type ConnectStepProps = {
  handle: string;
  /** The API the account lives on, named by the connect command. */
  apiUrl: string;
  /** Messages already in the inbox, waiting for a host to read them. */
  waiting: number;
  /** The hosted MCP server the chat apps sign in to, or `null` while there is none. */
  mcpUrl: string | null;
  /** The hosts that connected already, which the picker ticks: the chat apps that signed in, for now. */
  connectedHosts: readonly HostId[];
  /** What a chat app's steps ask this page's server while they wait for its sign-in. */
  api: Pick<ConnectApi, 'isToolSignedIn'>;
};

/**
 * Step 3: the operator hands the agent to whatever runs it. They pick the host from the list, and get its
 * steps: the commands to run in their terminal, with the one-time code in them, and its second way in; or,
 * for a chat app, its sign-in. The page moves on by itself once a host has connected.
 */
export function ConnectStep({ handle, apiUrl, waiting, mcpUrl, connectedHosts, api }: ConnectStepProps) {
  const createCode = useCallback(() => createOnboardingConnectCodeAction(handle), [handle]);
  const { state: code, retry } = useConnectCode(createCode, true);
  const [host, setHost] = useState<HostId>(DEFAULT_HOST);
  const connected = useMemo(() => new Set<HostId>(connectedHosts), [connectedHosts]);
  const chosen = hostOf(host);
  // Commands connect as the agent they name; a chat app's line names the agent already.
  const lead = chosen.group === 'commands' ? `${hostLead(chosen)} It connects as ${handle}.` : hostLead(chosen, handle);

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
      {/* Where the chosen host's steps happen, in place of the line above them, so the card keeps its height.
          It fades in anew when another host is chosen. */}
      <StepLead>
        <span key={lead} className="animate-overlay-in motion-reduce:animate-none">
          {lead}
        </span>
      </StepLead>

      <HostPicker selected={host} onSelect={setHost} connected={connected} />
      <HostPanel
        selected={host}
        handle={handle}
        apiUrl={apiUrl}
        code={code}
        onRetry={retry}
        mcpUrl={mcpUrl}
        docsUrl={DOCS_URL}
        connected={connected}
        api={api}
        // The card stays as tall as its tallest step: the second way in waits folded until it's asked for.
        alternativeOpen={false}
        hideLead
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-4 text-default">
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
