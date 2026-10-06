import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { TelegramSetup } from '@/components/channels/telegram-setup';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { type Channel, type ChannelVia, hasChannelEndpoint, listChannels } from '@/lib/human-channels-api';
import { findOperatorContactId } from '@/lib/human-operator';

export const metadata: Metadata = {
  title: 'Channels',
};

type ChannelRow = {
  via: ChannelVia;
  name: string;
  /** The agent's address on the channel once it has one, otherwise what it will get. */
  detail: string;
  connected: boolean;
  /** The row's control while the channel isn't connected. */
  setup: ReactNode;
};

export default async function ChannelsPage() {
  const account = await requireHumanAccount({ returnTo: '/channels' });
  const rows = await loadChannelRows(account);

  return (
    <>
      <PageHeader
        title="Channels"
        description="How your agent shows up on each channel. People reply right where the message lands."
      />
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell className="pl-4">Channel</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.via}>
              <TableCell className="h-18 pl-4">
                <div className="flex items-center gap-3">
                  <ChannelIcon via={row.via} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{row.name}</span>
                    <span className="truncate font-mono text-xs text-muted">{row.detail}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {row.connected ? <Badge variant="success">Connected</Badge> : <Badge>Not set up</Badge>}
              </TableCell>
              <TableCell className="pr-4 text-right">{!row.connected && row.setup}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="flex items-center gap-2.5 rounded-lg border border-border px-4 py-3 text-sm tracking-tight text-secondary">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        Every channel belongs to your agent: its own address, bot and app. One account, one agent.
      </p>
    </>
  );
}

/** Email, Telegram and Slack, in that order, whether or not the agent has them yet. */
async function loadChannelRows(account: HumanAccount): Promise<ChannelRow[]> {
  const [channels, operatorContactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);
  const channelOf = (via: ChannelVia) => channels.find((channel) => channel.via === via && channel.active);

  const email = channelOf('email');
  const telegram = channelOf('telegram');
  const slack = channelOf('slack');
  const [telegramConnected, slackConnected] = await Promise.all([
    isChatConnected(account, telegram, operatorContactId),
    isChatConnected(account, slack, operatorContactId),
  ]);

  return [
    {
      via: 'email',
      name: 'Email',
      detail: email?.address ?? 'Its own email address',
      connected: Boolean(email),
      setup: <ComingSoon />,
    },
    {
      via: 'telegram',
      name: 'Telegram',
      detail: 'Its own Telegram bot',
      connected: telegramConnected,
      setup: <TelegramSetup />,
    },
    {
      via: 'slack',
      name: 'Slack',
      detail: 'Its own Slack app in your workspace',
      connected: slackConnected,
      setup: <ComingSoon />,
    },
  ];
}

/**
 * A bot or app only counts once a message can travel on it: a person has written to it, or the operator
 * linked their own chat. Until then the setup isn't finished, even though the channel exists.
 */
async function isChatConnected(
  account: HumanAccount,
  channel: Channel | undefined,
  operatorContactId: string | null
): Promise<boolean> {
  if (!channel) {
    return false;
  }

  if (channel.connectedAt) {
    return true;
  }

  return operatorContactId ? hasChannelEndpoint(account, channel.identifier, operatorContactId) : false;
}

/** Email and Slack get their own setup drawers next; until then they're set up with `human setup`. */
function ComingSoon() {
  return (
    <Button variant="outline" disabled title="Coming soon. For now, run human setup in your terminal.">
      Set up
    </Button>
  );
}
