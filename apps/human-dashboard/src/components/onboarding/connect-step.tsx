'use client';

import { ArrowRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { createOnboardingConnectCodeAction } from '@/app/(account)/onboarding/actions';
import { HostPicker } from '@/components/connect/host-picker';
import { HostPanel } from '@/components/connect/host-steps';
import { DOCS_URL } from '@/components/dashboard/nav';
import { Eyebrow, StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { useHostConnectCode } from '@/hooks/use-connect-code';
import type { ConnectApi } from '@/lib/host-status';
import type { HostId } from '@/lib/hosts';

type ConnectStepProps = {
  handle: string;
  /** The agent's address, which a chat app's prompt names. */
  address: string;
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
  /** The host chosen in the picker. The agent's card next to the step waits for it by name. */
  host: HostId;
  onHostChange: (host: HostId) => void;
};

/**
 * Step 3 (`1.4 · Connect · prompt`): the operator hands the agent to whatever runs it. They pick the host from
 * the row of tiles and get its ways in, a tab each: the commands to run in their terminal, with the one-time
 * code in them, and its plugin or MCP config; or, for a chat app, its steps in the app and a prompt. The page
 * moves on by itself once a host has connected.
 */
export function ConnectStep({
  handle,
  address,
  apiUrl,
  waiting,
  mcpUrl,
  connectedHosts,
  api,
  host,
  onHostChange,
}: ConnectStepProps) {
  const createCode = useCallback((forHost: HostId) => createOnboardingConnectCodeAction(handle, forHost), [handle]);
  const { state: code, retry } = useHostConnectCode(createCode, host, true);
  const connected = useMemo(() => new Set<HostId>(connectedHosts), [connectedHosts]);

  return (
    <>
      <Eyebrow tone="accent">
        {waiting > 0
          ? `${waiting} ${waiting === 1 ? 'message is' : 'messages are'} waiting for your agent`
          : 'Waiting for your agent'}
      </Eyebrow>
      <StepTitle>
        Connect {handle} to <em>your agent</em>
      </StepTitle>
      <StepLead>Pick where your agent runs. The steps below change to match.</StepLead>

      <HostPicker selected={host} onSelect={onHostChange} connected={connected} />
      <HostPanel
        selected={host}
        handle={handle}
        address={address}
        apiUrl={apiUrl}
        code={code}
        onRetry={retry}
        mcpUrl={mcpUrl}
        docsUrl={DOCS_URL}
        connected={connected}
        api={api}
        // The agent's card says what the page waits for ("waiting for ChatGPT"). The card stays as tall as its
        // tallest step: listening for messages waits for the host's page and the drawer. A host that comes in
        // moves the onboarding on to step 4, so its box never says it's connected.
        showWaiting={false}
        showListen={false}
        showSignedIn={false}
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
