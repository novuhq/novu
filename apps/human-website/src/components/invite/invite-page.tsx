'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

import { InactiveInvite, Panel } from '@/components/invite/panel';
import { Button, buttonClassName } from '@/components/ui/button';
import { useInviteStatus } from '@/hooks/use-invite-status';
import {
  type ActiveInviteStatus,
  connectInviteChannel,
  declineInvite,
  describeSender,
  type InviteChannel,
  type InviteChannelVia,
  InviteRequestError,
  setInviteDefaultChannel,
} from '@/lib/invite-api';

import { AppIcon } from './app-icon';

const APPS: Record<InviteChannelVia, { label: string; hint: string }> = {
  telegram: { label: 'Telegram', hint: 'Scan a code with your phone, or open Telegram here.' },
  slack: { label: 'Slack', hint: 'Approve the app in your Slack workspace.' },
  email: { label: 'Email', hint: 'We’ll send a verification link to confirm the address.' },
};

type InactiveReason = 'expired' | 'declined' | 'invalid';

/**
 * Public page opened by someone invited with `human invite`. The token in the link is the
 * only credential. The person picks which of the inviter's apps (Telegram, Slack, Email) the
 * agent may reach them on and which one is their default. The status refreshes while the page
 * is open, so rows flip to "Connected" once they finish in Telegram/Slack or verify email.
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
  const [emailCooldownUntil, setEmailCooldownUntil] = useState<number | null>(null);

  if (inactiveReason) {
    return <InactiveInvite reason={inactiveReason} senderName={describeSender(status)} />;
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
        case 'verification_cooldown':
        case 'verification_cap':
          if (error.retryAfterSeconds) {
            setEmailCooldownUntil(Date.now() + error.retryAfterSeconds * 1000);
          }
          setErrorMessage(error.message);

          return;
      }
    }

    setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.');
  };

  const handleConnect = async (via: InviteChannelVia, address?: string) => {
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
      const result = await connectInviteChannel(apiUrl, token, via, address);

      if (via === 'email' && 'via' in result && result.via === 'email') {
        setEmailCooldownUntil(Date.now() + result.retryAfterSeconds * 1000);
        onChanged();

        return;
      }

      if (!('url' in result)) {
        return;
      }

      if (via === 'telegram') {
        setTelegramLink(result.url);
      } else if (tab && !tab.closed) {
        tab.location.href = result.url;
      } else {
        window.location.assign(result.url);
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
          <span className="font-medium text-foreground">{describeSender(status)}</span> would like to be able to reach
          you. Choose how:
        </>
      }
    >
      {status.channels.length > 0 ? (
        <ul
          aria-label="Apps you can connect"
          className="divide-y divide-border rounded-md bg-black ring-1 ring-accent/40"
        >
          {status.channels.map((channel) =>
            channel.via === 'email' ? (
              <EmailRow
                key={channel.via}
                channel={channel}
                connecting={connectingVia === 'email'}
                settingDefault={defaultingVia === 'email'}
                disabled={busy}
                cooldownUntil={emailCooldownUntil}
                onConnect={(address) => void handleConnect('email', address)}
                onMakeDefault={() => void handleMakeDefault('email')}
              />
            ) : (
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
            )
          )}
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

type EmailRowProps = {
  channel: InviteChannel;
  connecting: boolean;
  settingDefault: boolean;
  disabled: boolean;
  cooldownUntil: number | null;
  onConnect: (address: string) => void;
  onMakeDefault: () => void;
};

function EmailRow({
  channel,
  connecting,
  settingDefault,
  disabled,
  cooldownUntil,
  onConnect,
  onMakeDefault,
}: EmailRowProps) {
  const [address, setAddress] = useState('');
  const cooldownSeconds = useCountdown(cooldownUntil);
  const pending = channel.status === 'pending';
  const verified = channel.status === 'verified';

  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <AppIcon via="email" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium tracking-tight">
            Email
            {verified && channel.isDefault && (
              <span className="rounded-sm bg-accent/15 px-1.5 py-1 font-mono text-xs leading-none text-accent">
                default
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm leading-[1.3] tracking-tight text-foreground/60">
            {verified
              ? `Verified${channel.address ? ` · ${channel.address}` : ''}`
              : pending
                ? `Check your inbox${channel.address ? ` at ${channel.address}` : ''}`
                : APPS.email.hint}
          </p>
        </div>

        {verified && !channel.isDefault && (
          <Button
            variant="outline"
            pending={settingDefault}
            disabled={disabled}
            onClick={onMakeDefault}
            aria-label="Make Email your default"
          >
            Make default
          </Button>
        )}

        {verified && channel.isDefault && (
          <span className="shrink-0 font-mono text-sm text-accent">
            <span aria-hidden="true">✓</span>
            <span className="sr-only">Verified</span>
          </span>
        )}
      </div>

      {!verified && (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = address.trim();
            if (!trimmed || disabled || connecting || cooldownSeconds > 0) {
              return;
            }

            onConnect(trimmed);
          }}
        >
          <label className="sr-only" htmlFor="invite-email">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={disabled || connecting}
            className="min-w-0 flex-1 rounded-md border border-border bg-black px-3 py-2 font-mono text-sm tracking-tight text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
          />
          <Button
            type="submit"
            pending={connecting}
            disabled={disabled || cooldownSeconds > 0 || !address.trim()}
            aria-label={pending ? 'Resend verification email' : 'Send verification email'}
          >
            {pending ? (cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend') : 'Send verification'}
          </Button>
        </form>
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

function useCountdown(until: number | null): number {
  const [seconds, setSeconds] = useState(() => remainingSeconds(until));

  useEffect(() => {
    setSeconds(remainingSeconds(until));
    if (!until) {
      return;
    }

    const id = window.setInterval(() => {
      const next = remainingSeconds(until);
      setSeconds(next);
      if (next <= 0) {
        window.clearInterval(id);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [until]);

  return seconds;
}

function remainingSeconds(until: number | null): number {
  if (!until) {
    return 0;
  }

  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
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
