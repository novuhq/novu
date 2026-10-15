'use client';

import { useState } from 'react';

import { SlackSetup } from '@/components/channels/slack-setup';
import { TelegramSetup } from '@/components/channels/telegram-setup';
import { CONFIGURE_DRAWER_PARAM } from '@/components/dashboard/nav';
import { useNow } from '@/hooks/use-now';
import type { ToolId } from '@/lib/ai-tools';
import { type HostStatus, hostLiveness } from '@/lib/host-status';
import type { ChannelVia } from '@/lib/human-channels-api';
import type { ChannelRow } from '@/lib/human-channels-overview';
import type { SlackSetupState } from '@/lib/human-slack-setup';
import type { TelegramSetupState } from '@/lib/human-telegram-setup';

import { AgentSetup } from './agent-setup';
import { ChannelList } from './channel-list';
import { EmailDrawer } from './email-drawer';
import { type AgentState, IdentityCard } from './identity-card';

export type ConfigureAgent = {
  name: string;
  /** Its address without the domain: how the page calls it in a sentence, as the onboarding and the inbox do. */
  handle: string;
  address: string;
  cardLink: string;
  pictureUrl?: string;
  createdAt?: string;
  active: boolean;
};

type ConfigureViewProps = {
  /** The drawer the page opens with, when a link asked for one (`?setup=`). */
  initialDrawer: ChannelVia | null;
  agent: ConfigureAgent;
  /** The operator's full name, or empty when Clerk has none. */
  operatorName: string;
  channels: ChannelRow[];
  telegramSetup: TelegramSetupState;
  slackSetup: SlackSetupState;
  /** What the Slack app is called until the operator names it. */
  slackAppName: string;
  /** What the operator hands their own agent in each chat app's drawer. */
  channelPrompts: Record<'telegram' | 'slack', string>;
  /** Whether a host reads the agent's mail, or `null` when that couldn't be read: it then reads as not connected. */
  hostStatus: HostStatus | null;
  /** When the server rendered the page, so "2m ago" starts out as the server said it. */
  renderedAt: string;
  /** The API the account lives on, which the CLI is pointed at when it isn't its default. */
  apiUrl: string;
  docsUrl: string;
  mcpUrl: string | null;
  connectedTools: ToolId[];
};

/**
 * The Configure page (`4.1 · Configure`): the agent's card on the left; on the right its channels, each
 * with its drawer, and the agent behind it. Agent and Channels were two pages before; this is both.
 */
export function ConfigureView({
  initialDrawer,
  agent,
  operatorName,
  channels,
  telegramSetup,
  slackSetup,
  slackAppName,
  channelPrompts,
  hostStatus,
  renderedAt,
  apiUrl,
  docsUrl,
  mcpUrl,
  connectedTools,
}: ConfigureViewProps) {
  const [openDrawer, setOpenDrawer] = useState<ChannelVia | null>(initialDrawer);
  const drawerProps = (via: ChannelVia) => ({
    open: openDrawer === via,
    onOpenChange: (open: boolean) => {
      setOpenDrawer(open ? via : null);
      if (!open) {
        forgetDrawerParam();
      }
    },
  });

  const connected = (via: ChannelVia) => channels.some((channel) => channel.via === via && channel.connected);
  // The address the email channel really has. `agent.address` falls back to one made from the handle, which
  // nothing receives when the inbox couldn't be set up, so it's never shown, copied or put in the QR code.
  const email = channels.find((channel) => channel.via === 'email' && channel.connected)?.handles[0]?.value ?? null;
  const telegramBot = connected('telegram') && 'botUsername' in telegramSetup ? telegramSetup.botUsername : '';
  const slack = connected('slack') ? describeSlack(slackSetup) : null;
  // A host reads its mail while one checked the inbox within the last day.
  const now = useNow(renderedAt);
  const hostConnected = hostLiveness(hostStatus?.lastCheckedAt, now) === 'live';
  const state: AgentState = !agent.active ? 'paused' : hostConnected ? 'active' : 'waiting';

  return (
    <>
      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <IdentityCard
          name={agent.name}
          handle={agent.handle}
          address={email}
          cardLink={agent.cardLink}
          pictureUrl={agent.pictureUrl}
          createdAt={agent.createdAt}
          operatorName={operatorName}
          state={state}
          hostConnected={hostConnected}
          telegram={connected('telegram') ? { bot: telegramBot ? `@${telegramBot}` : null } : null}
          slack={slack && (joinDefined([slack.appName, slack.workspace], ' · ') || 'Connected')}
        />

        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-xl leading-7 font-medium tracking-[-0.3px] text-foreground">
              Configure {agent.handle}
            </h1>
            <p className="text-[13px] leading-4.5 text-secondary">Channels, agents and settings.</p>
          </header>
          <ChannelList
            handle={agent.handle}
            channels={channels}
            details={{
              ...(email ? { email } : {}),
              ...(telegramBot ? { telegram: `@${telegramBot}` } : {}),
              ...(slack ? { slack: joinDefined([slack.appName, slack.workspace], ' in ') || 'Connected' } : {}),
            }}
            onOpen={setOpenDrawer}
          />
          <AgentSetup
            handle={agent.handle}
            address={email}
            apiUrl={apiUrl}
            hostStatus={hostStatus}
            renderedAt={renderedAt}
            docsUrl={docsUrl}
            mcpUrl={mcpUrl}
            connectedTools={connectedTools}
          />
          {/* The Settings card (NV-9039) goes here, 20px under Agent setup. */}
        </div>
      </div>

      <EmailDrawer handle={agent.handle} address={email} {...drawerProps('email')} />
      <TelegramSetup
        setup={telegramSetup}
        handle={agent.handle}
        prompt={channelPrompts.telegram}
        {...drawerProps('telegram')}
      />
      <SlackSetup
        setup={slackSetup}
        agentName={slackAppName}
        handle={agent.handle}
        prompt={channelPrompts.slack}
        {...drawerProps('slack')}
      />
    </>
  );
}

/** The Slack app's name and the workspace it's in. Either can be missing when Slack couldn't be read just now. */
function describeSlack(setup: SlackSetupState): { appName?: string; workspace?: string } {
  return setup.step === 'connected' ? { appName: setup.appName, workspace: setup.workspace } : {};
}

function joinDefined(parts: (string | undefined)[], separator: string): string {
  return parts.filter(Boolean).join(separator);
}

/** Takes `?setup=` off the address once its drawer is closed, so a reload doesn't open the drawer again. */
function forgetDrawerParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CONFIGURE_DRAWER_PARAM)) {
    return;
  }

  url.searchParams.delete(CONFIGURE_DRAWER_PARAM);
  window.history.replaceState(null, '', url);
}
