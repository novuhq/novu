'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';

import { Panel } from '@/components/site/panel';
import { Button, buttonClassName } from '@/components/ui/button';
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

import { AppIcon } from './app-icon';

const APPS: Record<InviteChannelVia, { label: string; hint: string }> = {
  telegram: { label: 'Telegram', hint: 'Scan a code with your phone, or open Telegram here.' },
  slack: { label: 'Slack', hint: 'Approve the app in your Slack workspace.' },
};

type InactiveReason = 'expired' | 'declined' | 'invalid';

/**
 * Public page opened by someone invited with `human invite`. The token in the link is the
 * only credential. The person picks which of the inviter's apps (Telegram, Slack) the agent
 * may reach them on and which one is their default. The status refreshes while the page is
 * open, so rows flip to "Connected" once they finish in Telegram or Slack.
 */
export function InvitePage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const { state, refresh } = useInviteStatus(apiUrl, token);

  if (state.phase === 'loading') {
    return (
      <Panel eyebrow="invitation" title="Checking your invitation">
        <p className="font-mono text-sm tracking-tight text-foreground/50">
          Loading
          <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
            ▍
          </span>
        </p>
      </Panel>
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

  const busy = connectingVia !== null || defaultingVia !== null || declining;
  const anyConnected = status.channels.some((channel) => channel.connected);

  return (
    <Panel
      eyebrow="invitation"
      title={
        <>
          Hi <em className="font-display tracking-tight text-accent">{status.inviteeName}</em>
        </>
      }
      description={
        <>
          <span className="font-medium text-foreground">{status.agentName}</span> would like to be able to reach you.
          Choose how:
        </>
      }
    >
      {status.channels.length > 0 ? (
        <ul
          aria-label="Apps you can connect"
          className="divide-y divide-border rounded-md bg-black ring-1 ring-accent/40"
        >
          {status.channels.map((channel) => (
            <ChannelRow
              key={channel.via}
              channel={channel}
              link={channel.via === 'telegram' ? telegramLink : null}
              connecting={connectingVia === channel.via}
              settingDefault={defaultingVia === channel.via}
              disabled={busy}
              onConnect={() => void handleConnect(channel.via)}
              onMakeDefault={() => void handleMakeDefault(channel.via)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[15px] leading-[1.375] tracking-tight text-foreground/70">
          There&apos;s no way to connect right now. Ask the person who invited you to check their setup.
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
        >
          {errorMessage}
        </p>
      )}

      {!anyConnected && (
        <Button variant="text" className="mt-4 -ml-2" pending={declining} disabled={busy} onClick={handleDecline}>
          No thanks
        </Button>
      )}

      <ExpiryNote expiresAt={status.expiresAt} anyConnected={anyConnected} />
    </Panel>
  );
}

type ChannelRowProps = {
  channel: InviteChannel;
  /** Freshly minted connect link, shown in the row instead of opening a tab (Telegram). */
  link: string | null;
  connecting: boolean;
  settingDefault: boolean;
  disabled: boolean;
  onConnect: () => void;
  onMakeDefault: () => void;
};

function ChannelRow({
  channel,
  link,
  connecting,
  settingDefault,
  disabled,
  onConnect,
  onMakeDefault,
}: ChannelRowProps) {
  const app = APPS[channel.via];
  const showLink = Boolean(link) && !channel.connected;

  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <AppIcon via={channel.via} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium tracking-tight">
            {app.label}
            {channel.connected && channel.isDefault && (
              <span className="rounded-sm bg-accent/15 px-1.5 py-1 font-mono text-xs leading-none text-accent">
                default
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm leading-[1.3] tracking-tight text-foreground/60">
            {channel.connected ? 'Connected' : app.hint}
          </p>
        </div>

        {!channel.connected && !showLink && (
          <Button pending={connecting} disabled={disabled} onClick={onConnect} aria-label={`Connect ${app.label}`}>
            Connect
          </Button>
        )}

        {channel.connected && !channel.isDefault && (
          <Button
            variant="outline"
            pending={settingDefault}
            disabled={disabled}
            onClick={onMakeDefault}
            aria-label={`Make ${app.label} your default`}
          >
            Make default
          </Button>
        )}

        {channel.connected && channel.isDefault && (
          <span className="shrink-0 font-mono text-sm text-accent">
            <span aria-hidden="true">✓</span>
            <span className="sr-only">Connected</span>
          </span>
        )}
      </div>

      {showLink && link && (
        <TelegramLinkPanel url={link} refreshing={connecting} disabled={disabled} onRefresh={onConnect} />
      )}
    </li>
  );
}

type TelegramLinkPanelProps = {
  url: string;
  refreshing: boolean;
  disabled: boolean;
  onRefresh: () => void;
};

function TelegramLinkPanel({ url, refreshing, disabled, onRefresh }: TelegramLinkPanelProps) {
  const bot = telegramBotUsername(url);

  return (
    <div className="mt-3 flex flex-col items-center gap-3 rounded-md bg-border/60 p-4">
      {/* On a phone the code is no use: the button opens the Telegram app directly. */}
      <figure className="hidden flex-col items-center gap-2 sm:flex">
        <div className="rounded-md bg-foreground p-2.5">
          <QRCode
            value={url}
            size={148}
            bgColor="#eee5d8"
            fgColor="#000000"
            aria-label={`QR code that opens ${bot ? `@${bot}` : 'the bot'} in Telegram`}
          />
        </div>
        <figcaption className="font-mono text-xs tracking-tight text-foreground/60">
          Scan to open {bot ? <span className="text-foreground">@{bot}</span> : 'the bot'} in Telegram
        </figcaption>
      </figure>
      <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClassName('outline')}>
        Open Telegram on this device
      </a>
      <p className="text-center text-sm leading-[1.4] tracking-tight text-foreground/60">
        Then tap Start. The code works for 10 minutes.{' '}
        <button
          type="button"
          className="cursor-pointer text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || refreshing}
          onClick={onRefresh}
        >
          Get a new code
        </button>
      </p>
    </div>
  );
}

function ExpiryNote({ expiresAt, anyConnected }: { expiresAt: string; anyConnected: boolean }) {
  const expiry = new Date(expiresAt);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const absolute = expiry.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <p className="mt-6 font-mono text-xs leading-[1.5] tracking-tight text-foreground/50">
      This link expires {relativeTime(expiry)} ({absolute}).
      {anyConnected && ' You can connect more apps from this page until then.'}
    </p>
  );
}

function InactiveInvite({ reason, agentName }: { reason: InactiveReason; agentName?: string }) {
  switch (reason) {
    case 'declined':
      return (
        <Panel
          eyebrow="invitation"
          title={
            <>
              Invitation <em className="font-display tracking-tight text-accent">declined</em>
            </>
          }
          description={
            <>
              {agentName ? (
                <>
                  <span className="font-medium text-foreground">{agentName}</span> won&apos;t contact you through this
                  link.
                </>
              ) : (
                "You won't be contacted through this link."
              )}{' '}
              You can close this tab.
            </>
          }
        />
      );
    case 'expired':
      return (
        <Panel
          eyebrow="invitation"
          title={
            <>
              This invitation has <em className="font-display tracking-tight text-accent">expired</em>
            </>
          }
          description="Invitation links work for a limited time. Ask the person who invited you to send a new one."
        />
      );
    default:
      return (
        <Panel
          eyebrow="invitation"
          title={
            <>
              This link <em className="font-display tracking-tight text-accent">isn&apos;t valid</em>
            </>
          }
          description="It may be incomplete or already replaced. Ask the person who invited you to send a new one."
        />
      );
  }
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
