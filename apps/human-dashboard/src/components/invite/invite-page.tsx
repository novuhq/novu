'use client';

import { ArrowUpRight, User } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import QRCode from 'react-qr-code';

import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mascot } from '@/components/ui/mascot';
import { useInviteStatus } from '@/hooks/use-invite-status';
import {
  type ActiveInviteStatus,
  connectInviteChannel,
  declineInvite,
  type InviteChannel,
  type InviteChannelVia,
  InviteRequestError,
  setInviteDefaultChannel,
} from '@/lib/invite-api';
import { cn } from '@/lib/utils';

import { AppIcon } from './app-icon';

const APP_LABELS: Record<InviteChannelVia, string> = {
  telegram: 'Telegram',
  slack: 'Slack',
};

type InactiveReason = 'expired' | 'declined' | 'invalid';

/** Which card is on screen: the list of apps, the steps for one app, or the goodbye card. */
type InviteView = 'channels' | InviteChannelVia | 'done';

/**
 * Public page opened by someone invited with `human invite`. The token in the link is the
 * only credential. The person picks which of the inviter's apps (Telegram, Slack) the agent
 * may reach them on and which one is their default. The status refreshes while the page is
 * open, so a card flips to "Connected" once they finish in Telegram or Slack.
 */
export function InvitePage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const { state, refresh } = useInviteStatus(apiUrl, token);

  if (state.phase === 'loading') {
    return (
      <InviteCard>
        <CardTitle>Checking your invite</CardTitle>
        <output className="mt-3 block font-mono text-sm tracking-tight text-secondary">
          Loading
          <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
            ▍
          </span>
        </output>
      </InviteCard>
    );
  }

  if (state.phase === 'failed') {
    return <InactiveInvite reason="invalid" />;
  }

  if (!state.status.valid) {
    return <InactiveInvite reason={state.status.reason} />;
  }

  return <ActiveInvite apiUrl={apiUrl} token={token} status={state.status} onChanged={() => void refresh()} />;
}

type ActiveInviteProps = {
  apiUrl: string;
  token: string;
  status: ActiveInviteStatus;
  onChanged: () => void;
};

function ActiveInvite({ apiUrl, token, status, onChanged }: ActiveInviteProps) {
  const [inactiveReason, setInactiveReason] = useState<InactiveReason | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [view, setView] = useState<InviteView>('channels');
  const [connectingVia, setConnectingVia] = useState<InviteChannelVia | null>(null);
  const [defaultingVia, setDefaultingVia] = useState<InviteChannelVia | null>(null);
  const [declining, setDeclining] = useState(false);

  if (inactiveReason) {
    return <InactiveInvite reason={inactiveReason} agentName={status.agentName} />;
  }

  const handleError = (error: unknown) => {
    if (error instanceof InviteRequestError) {
      switch (error.code) {
        case 'token_expired':
          setInactiveReason('expired');

          return;
        case 'token_invalid':
          setInactiveReason('invalid');

          return;
        case 'invite_declined':
          setInactiveReason('declined');

          return;
        case 'channel_already_connected':
          onChanged();

          return;
      }
    }

    setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.');
  };

  const handleConnect = async (via: InviteChannelVia) => {
    setErrorMessage(null);

    // t.me hands off to the app through a `tg://` link, which fails on a computer without
    // Telegram installed, so show the link as a QR code for the phone next to a button that
    // opens it here instead of opening a tab.
    // For Slack, open the tab synchronously inside the click so the browser doesn't block it
    // as a popup, then point it at Slack once the freshly minted link arrives.
    const tab = via === 'slack' ? window.open('', '_blank') : null;
    if (tab) {
      tab.opener = null;
    }

    setConnectingVia(via);
    try {
      const { url } = await connectInviteChannel(apiUrl, token, via);

      if (via === 'telegram') {
        setTelegramLink(url);
        setView('telegram');
      } else if (tab && !tab.closed) {
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (error) {
      tab?.close();
      handleError(error);
    } finally {
      setConnectingVia(null);
    }
  };

  const handleMakeDefault = async (via: InviteChannelVia) => {
    setErrorMessage(null);
    setDefaultingVia(via);
    try {
      await setInviteDefaultChannel(apiUrl, token, via);
      onChanged();
    } catch (error) {
      handleError(error);
    } finally {
      setDefaultingVia(null);
    }
  };

  const handleDecline = async () => {
    setErrorMessage(null);
    setDeclining(true);
    try {
      await declineInvite(apiUrl, token);
      setInactiveReason('declined');
    } catch (error) {
      handleError(error);
    } finally {
      setDeclining(false);
    }
  };

  const showChannels = () => {
    setErrorMessage(null);
    setView('channels');
  };

  const busy = connectingVia !== null || defaultingVia !== null || declining;
  const connectedChannels = status.channels.filter((channel) => channel.connected);
  const anyConnected = connectedChannels.length > 0;
  const telegramBot = telegramLink ? telegramBotUsername(telegramLink) : undefined;
  const error = errorMessage && <ErrorNote>{errorMessage}</ErrorNote>;

  if (view === 'done' && anyConnected) {
    const defaultChannel = connectedChannels.find((channel) => channel.isDefault) ?? connectedChannels[0];

    return (
      <DoneCard
        agentName={status.agentName}
        inviteeName={status.inviteeName}
        via={defaultChannel.via}
        telegramBot={telegramBot}
      />
    );
  }

  // The status refreshes in the background: once the app shows up as connected, its steps are
  // over and the list (now with "Connected") takes their place.
  const stepsFor = status.channels.find((channel) => channel.via === view && !channel.connected)?.via;

  if (stepsFor === 'telegram' && telegramLink) {
    return (
      <InviteCard>
        <InviterLine />
        <AppIcon via="telegram" size="large" className="mt-6" />
        <CardTitle className="mt-4">Open the bot and press Start</CardTitle>
        <CardText>
          That tells {telegramBot ? <Handle>@{telegramBot}</Handle> : 'the bot'} it can reach you. Nothing else to set
          up.
        </CardText>

        <div className="mt-6 flex items-center gap-5">
          {/* On a phone the code is no use: the button opens the Telegram app directly. */}
          <TelegramQrCode url={telegramLink} bot={telegramBot} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName('primary', 'h-10 w-full')}
            >
              <ArrowUpRight aria-hidden="true" className="size-4" />
              Open in Telegram
            </a>
            <p className="hidden text-center text-xs tracking-tight text-secondary sm:block">Or scan with your phone</p>
          </div>
        </div>

        <WaitingLine>Waiting for connection…</WaitingLine>
        <p className="mt-2 text-xs leading-normal tracking-tight text-secondary">
          The link works for 10 minutes.{' '}
          <button
            type="button"
            className="cursor-pointer rounded-sm text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => void handleConnect('telegram')}
          >
            Get a new one
          </button>
        </p>

        {error}
        <Button variant="outline" className="mt-6 h-10 w-full" onClick={showChannels}>
          Choose another way
        </Button>
      </InviteCard>
    );
  }

  if (stepsFor === 'slack') {
    return (
      <InviteCard>
        <InviterLine />
        <AppIcon via="slack" size="large" className="mt-6" />
        <CardTitle className="mt-4">Confirm your Slack account</CardTitle>
        <CardText>Sign in to Slack so {status.agentName} knows where to DM you. Nothing else to set up.</CardText>

        <Button
          className="mt-6 h-10 w-full"
          pending={connectingVia === 'slack'}
          disabled={busy}
          onClick={() => void handleConnect('slack')}
        >
          <ArrowUpRight aria-hidden="true" className="size-4" />
          Continue with Slack
        </Button>
        <WaitingLine>Waiting for Slack…</WaitingLine>

        {error}
        <Button variant="outline" className="mt-6 h-10 w-full" onClick={showChannels}>
          Choose another way
        </Button>
      </InviteCard>
    );
  }

  return (
    <InviteCard>
      <InviterLine />
      <CardTitle className="mt-6">
        Get <Accent>asks</Accent> from {status.agentName}
      </CardTitle>
      <CardText>
        {anyConnected
          ? `You're connected. Asks go to your default channel, unless ${status.agentName} picks another.`
          : 'When it needs a yes, a no or an answer, it messages you. Choose where.'}
      </CardText>

      {status.channels.length > 0 ? (
        <ul aria-label="Apps you can connect" className="mt-6 flex flex-col gap-2">
          {status.channels.map((channel) => (
            <ChannelRow
              key={channel.via}
              channel={channel}
              description={channelDescription(channel.via, telegramBot)}
              connecting={connectingVia === channel.via}
              settingDefault={defaultingVia === channel.via}
              disabled={busy}
              onConnect={() => {
                // Telegram needs its link before there is anything to show; Slack mints its
                // link on the next card, inside the click that opens the tab.
                if (channel.via === 'telegram') {
                  void handleConnect('telegram');
                } else {
                  setErrorMessage(null);
                  setView(channel.via);
                }
              }}
              onMakeDefault={() => void handleMakeDefault(channel.via)}
            />
          ))}
        </ul>
      ) : (
        <CardText>
          There&apos;s no way to connect right now. Ask the person who invited you to check their setup.
        </CardText>
      )}

      {error}

      {anyConnected && (
        <Button className="mt-6 h-10 w-full" disabled={busy} onClick={() => setView('done')}>
          Done
        </Button>
      )}

      {status.channels.length > 0 && (
        <p className="mt-5 text-xs leading-normal tracking-tight text-secondary">
          By connecting, you let {status.agentName} message you there. Reply STOP anytime to leave.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ExpiryNote expiresAt={status.expiresAt} />
        {!anyConnected && (
          <Button variant="text" className="-mr-2" pending={declining} disabled={busy} onClick={handleDecline}>
            No thanks
          </Button>
        )}
      </div>
    </InviteCard>
  );
}

type ChannelRowProps = {
  channel: InviteChannel;
  description: string;
  connecting: boolean;
  settingDefault: boolean;
  disabled: boolean;
  onConnect: () => void;
  onMakeDefault: () => void;
};

function ChannelRow({
  channel,
  description,
  connecting,
  settingDefault,
  disabled,
  onConnect,
  onMakeDefault,
}: ChannelRowProps) {
  const label = APP_LABELS[channel.via];

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background p-3">
      <AppIcon via={channel.via} />
      <div className="min-w-0 flex-1 basis-28">
        <p className="text-[15px] font-medium tracking-tight">{label}</p>
        <p className="mt-0.5 text-sm leading-[1.3] tracking-tight text-secondary">{description}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {channel.connected && <Badge variant="success">Connected</Badge>}

        {channel.connected && channel.isDefault && <Badge variant="accent">Default</Badge>}

        {channel.connected && !channel.isDefault && (
          <Button
            variant="outline"
            pending={settingDefault}
            disabled={disabled}
            onClick={onMakeDefault}
            aria-label={`Make ${label} your default`}
          >
            Make default
          </Button>
        )}

        {!channel.connected && (
          <Button
            variant="outline"
            pending={connecting}
            disabled={disabled}
            onClick={onConnect}
            aria-label={`Connect ${label}`}
          >
            Connect
          </Button>
        )}
      </div>
    </li>
  );
}

/** The deep link as a code to scan, on a light tile with the Telegram mark in the middle. */
function TelegramQrCode({ url, bot }: { url: string; bot?: string }) {
  return (
    <div className="relative hidden shrink-0 rounded-md bg-foreground p-2.5 sm:block">
      {/* Level Q keeps the code readable with the mark covering its center. */}
      <QRCode
        value={url}
        size={132}
        level="Q"
        bgColor="#ebe2d6"
        fgColor="#0a0908"
        aria-label={`QR code that opens ${bot ? `@${bot}` : 'the bot'} in Telegram`}
      />
      <AppIcon
        via="telegram"
        className="absolute top-1/2 left-1/2 size-8 -translate-1/2 border-2 border-foreground bg-telegram text-on-accent"
      />
    </div>
  );
}

type DoneCardProps = {
  agentName: string;
  inviteeName: string;
  /** The app the agent writes to first. */
  via: InviteChannelVia;
  telegramBot?: string;
};

function DoneCard({ agentName, inviteeName, via, telegramBot }: DoneCardProps) {
  const firstName = inviteeName.trim().split(/\s+/)[0];
  const sender = via === 'telegram' && telegramBot ? `@${telegramBot}` : APP_LABELS[via];

  return (
    <InviteCard>
      <Mascot mood="happy" className="size-12" />
      <CardTitle className="mt-5">
        You&apos;re in{firstName && ', '}
        {firstName && <Accent>{firstName}</Accent>}
      </CardTitle>
      <CardText>
        {agentName} will message you on {APP_LABELS[via]} when it needs you. It looks like this:
      </CardText>

      <figure aria-label="Example message" className="mt-6 rounded-md border border-border bg-background p-4">
        <figcaption className="flex items-center gap-2 font-mono text-xs tracking-tight text-secondary">
          <AppIcon via={via} size="small" />
          {sender}
        </figcaption>
        <p className="mt-3 text-[15px] leading-snug tracking-tight">
          {agentName} wants to deploy api to production. OK?
        </p>
        {/* A picture of the buttons in the chat app, not something to press here. */}
        <div aria-hidden="true" className="mt-4 flex gap-2 text-sm font-medium tracking-tight select-none">
          <span className="flex h-8 items-center rounded bg-accent px-3.5 text-on-accent">Approve</span>
          <span className="flex h-8 items-center rounded bg-surface px-3.5">Deny</span>
        </div>
      </figure>

      <p className="mt-5 text-xs leading-normal tracking-tight text-secondary">
        You can close this tab. To stop, reply STOP in any message.
      </p>
    </InviteCard>
  );
}

function InactiveInvite({ reason, agentName }: { reason: InactiveReason; agentName?: string }) {
  const { title, text } = inactiveCopy(reason, agentName);

  return (
    <InviteCard>
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full border-2 border-dotted border-accent bg-accent/10 font-mono text-lg text-accent"
      >
        !
      </span>
      <CardTitle className="mt-5">{title}</CardTitle>
      <CardText>{text}</CardText>
    </InviteCard>
  );
}

function inactiveCopy(reason: InactiveReason, agentName?: string): { title: string; text: string } {
  switch (reason) {
    case 'declined':
      return {
        title: 'Invite declined',
        text: `${agentName ?? 'The agent'} won't contact you through this link. You can close this tab.`,
      };
    case 'expired':
      return {
        title: 'This invite has expired',
        text: 'Invite links last 3 days. Ask the person who invited you for a new one.',
      };
    default:
      return {
        title: "This link isn't valid",
        text: 'It may be incomplete or already replaced. Ask the person who invited you for a new one.',
      };
  }
}

/** The one card of the page, with the dithered glow fading in from its top right corner. */
function InviteCard({ children }: { children: ReactNode }) {
  return (
    <Card glow className="w-full max-w-130 p-5 sm:p-8">
      {children}
    </Card>
  );
}

function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h1 className={cn('text-2xl leading-tight tracking-tight sm:text-[28px]', className)}>{children}</h1>;
}

function CardText({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[15px] leading-normal tracking-tight text-secondary">{children}</p>;
}

/** The accent word of a heading, in the italic display face. */
function Accent({ children }: { children: ReactNode }) {
  return <em className="font-display text-[1.1em] text-accent">{children}</em>;
}

function Handle({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[0.93em] text-foreground">{children}</span>;
}

/** Who is asking: a person and their agent. The invite doesn't say who the person is. */
function InviterLine() {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex shrink-0 items-center">
        <span className="flex size-6 items-center justify-center rounded-full bg-surface text-secondary ring-2 ring-subtle">
          <User className="size-3.5" />
        </span>
        <Mascot className="-ml-1.5 size-6 rounded-full ring-2 ring-subtle" />
      </span>
      <p className="text-sm tracking-tight text-secondary">You&apos;ve been invited</p>
    </div>
  );
}

function WaitingLine({ children }: { children: ReactNode }) {
  return (
    <output className="mt-6 flex items-center gap-2.5 text-sm tracking-tight text-secondary">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
      {children}
    </output>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
    >
      {children}
    </p>
  );
}

function ExpiryNote({ expiresAt }: { expiresAt: string }) {
  const expiry = new Date(expiresAt);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const absolute = expiry.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <p className="text-xs leading-normal tracking-tight text-secondary" title={absolute}>
      This link expires {relativeTime(expiry)}.
    </p>
  );
}

function channelDescription(via: InviteChannelVia, telegramBot?: string): string {
  if (via === 'telegram') {
    return telegramBot ? `Reply in a chat with @${telegramBot}` : 'Reply in a Telegram chat';
  }

  return 'Reply in a Slack DM';
}

/** `https://t.me/novu_bot?start=…` → `novu_bot`. */
function telegramBotUsername(url: string): string | undefined {
  try {
    return new URL(url).pathname.replace(/^\//, '') || undefined;
  } catch {
    return undefined;
  }
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "in 3 days", "in 5 hours", … */
function relativeTime(target: Date): string {
  const seconds = Math.round((target.getTime() - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }

  return format.format(seconds, 'second');
}
