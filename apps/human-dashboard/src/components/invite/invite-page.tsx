'use client';

import { ArrowUpRight, User } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

import { AgentAvatar } from '@/components/ui/agent-avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Field, Input } from '@/components/ui/input';
import { MascotFace } from '@/components/ui/mascot-face';
import { useInviteStatus } from '@/hooks/use-invite-status';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import {
  type ActiveInviteStatus,
  type ConnectInviteResult,
  connectInviteChannel,
  declineInvite,
  type InviteChannel,
  type InviteChannelVia,
  InviteRequestError,
  setInviteDefaultChannel,
  verifyInviteCode,
} from '@/lib/invite-api';
import { cn } from '@/lib/utils';

import { AppIcon } from './app-icon';

const APP_LABELS: Record<InviteChannelVia, string> = {
  email: 'Email',
  telegram: 'Telegram',
  slack: 'Slack',
};

const REMEMBERED_EMAIL_PREFIX = 'human-verify-email:';

function readRememberedEmail(token: string): string {
  try {
    return sessionStorage.getItem(`${REMEMBERED_EMAIL_PREFIX}${token}`) ?? '';
  } catch {
    return '';
  }
}

function rememberEmail(token: string, address: string) {
  try {
    sessionStorage.setItem(`${REMEMBERED_EMAIL_PREFIX}${token}`, address);
  } catch {
    // A private window can refuse storage. The code can still be entered.
  }
}

type InactiveReason = 'expired' | 'declined' | 'invalid';

/** Which card is on screen: the list of apps, the steps for one app, or the goodbye card. */
type InviteView = 'channels' | InviteChannelVia | 'done';

/**
 * Public page opened by someone invited with `contact invite`. The token in the link is the
 * only credential. The person picks which of the inviter's channels (Email, Telegram, Slack) the agent
 * may reach them on and which one is their default. The status refreshes while the page is
 * open, so a card flips to "Connected" once they finish in Telegram or Slack.
 */
export function InvitePage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const { state, refresh } = useInviteStatus(apiUrl, token);

  if (state.phase === 'loading') {
    return (
      <InviteCard step="loading">
        <StepTitle>Checking your invite</StepTitle>
        <output className="block font-mono text-[13px] leading-4.5 text-secondary">
          Loading
          <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
            ▍
          </span>
        </output>
      </InviteCard>
    );
  }

  if (state.phase === 'failed') {
    return (
      <InviteCard step="inactive">
        <InactiveInvite reason="invalid" />
      </InviteCard>
    );
  }

  if (!state.status.valid) {
    return (
      <InviteCard step="inactive">
        <InactiveInvite reason={state.status.reason} />
      </InviteCard>
    );
  }

  return <ActiveInvite apiUrl={apiUrl} token={token} status={state.status} onChanged={() => void refresh()} />;
}

function followConnectResult(
  result: ConnectInviteResult,
  via: InviteChannelVia,
  actions: {
    stillHere: () => boolean;
    tab: Window | null;
    onEmailSent: (retryAfterSeconds: number) => void;
    onTelegram: (url: string) => void;
  }
): void {
  if ('via' in result && result.via === 'email') {
    actions.onEmailSent(result.retryAfterSeconds);

    return;
  }

  if (!('url' in result)) {
    return;
  }

  if (via === 'telegram') {
    // Only when they are still where they asked for it: going back meanwhile is the newer choice.
    if (actions.stillHere()) {
      actions.onTelegram(result.url);
    }

    return;
  }

  if (actions.tab && !actions.tab.closed) {
    actions.tab.location.href = result.url;

    return;
  }

  window.location.assign(result.url);
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
  // Whether they pressed "Continue with Slack": before that there is nothing to wait for.
  const [slackStarted, setSlackStarted] = useState(false);
  const [emailCooldownUntil, setEmailCooldownUntil] = useState<number | null>(null);
  const [emailSentTo, setEmailSentTo] = useState(() => readRememberedEmail(token));
  const [awaitingEmailCode, setAwaitingEmailCode] = useState(false);
  const [dismissedEmailCode, setDismissedEmailCode] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeInvalid, setEmailCodeInvalid] = useState(false);
  const [emailCodeLocked, setEmailCodeLocked] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  // Counts the times they chose to go back, so a request from before that can tell it's stale.
  const navigations = useRef(0);

  // Every view below is the same card, so it grows or shrinks to the next one instead of being swapped.
  if (inactiveReason) {
    return (
      <InviteCard step="inactive">
        <InactiveInvite reason={inactiveReason} agentName={status.agentName} />
      </InviteCard>
    );
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
        case 'verification_code_too_many_tries':
          if (error.retryAfterSeconds) {
            setEmailCooldownUntil(Date.now() + error.retryAfterSeconds * 1000);
          }
          if (error.code === 'verification_code_too_many_tries') {
            setEmailCodeLocked(true);
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

    const navigation = navigations.current;

    setConnectingVia(via);
    if (via === 'slack') {
      setSlackStarted(true);
    }
    try {
      const result = await connectInviteChannel(apiUrl, token, via, address);
      followConnectResult(result, via, {
        stillHere: () => navigation === navigations.current,
        tab,
        onEmailSent: (retryAfterSeconds) => {
          setEmailCooldownUntil(Date.now() + retryAfterSeconds * 1000);
          if (address) {
            setEmailSentTo(address);
            rememberEmail(token, address);
          }
          setAwaitingEmailCode(true);
          setEditingEmail(false);
          setDismissedEmailCode(false);
          setEmailCode('');
          setEmailCodeInvalid(false);
          setEmailCodeLocked(false);
          setView('email');
          onChanged();
        },
        onTelegram: (url) => {
          setTelegramLink(url);
          setView('telegram');
        },
      });
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
    navigations.current += 1;
    setErrorMessage(null);
    setView('channels');
  };

  const leaveEmailCode = () => {
    setDismissedEmailCode(true);
    setAwaitingEmailCode(false);
    setEditingEmail(false);
    setEmailCode('');
    setEmailCodeInvalid(false);
    showChannels();
  };

  const submitEmailCode = async (code: string) => {
    setErrorMessage(null);
    setEmailCodeInvalid(false);
    setConfirmingCode(true);
    try {
      await verifyInviteCode(apiUrl, token, code);
      onChanged();
    } catch (error) {
      setEmailCode('');
      if (error instanceof InviteRequestError && error.code === 'verification_code_invalid') {
        setEmailCodeInvalid(true);
      }
      handleError(error);
    } finally {
      setConfirmingCode(false);
    }
  };

  const busy = connectingVia !== null || defaultingVia !== null || declining || confirmingCode;
  const connectedChannels = status.channels.filter((channel) => channel.connected);
  const anyConnected = connectedChannels.length > 0;
  const telegramBot = telegramLink ? telegramBotUsername(telegramLink) : undefined;
  const error = errorMessage && <ErrorNote>{errorMessage}</ErrorNote>;
  const emailChannel = status.channels.find((channel) => channel.via === 'email');
  const showEmailCode =
    !editingEmail &&
    !dismissedEmailCode &&
    !emailChannel?.connected &&
    view !== 'telegram' &&
    view !== 'slack' &&
    view !== 'done' &&
    (emailChannel?.status === 'pending' || awaitingEmailCode);

  if (view === 'done' && anyConnected) {
    // No default among the apps here means asks go somewhere else by default, such as their email.
    const defaultChannel = connectedChannels.find((channel) => channel.isDefault);

    return (
      <InviteCard step="done">
        <DoneCard
          agentName={status.agentName}
          inviteeName={status.inviteeName}
          via={(defaultChannel ?? connectedChannels[0]).via}
          isDefault={defaultChannel !== undefined}
          telegramBot={telegramBot}
          onBack={showChannels}
        />
      </InviteCard>
    );
  }

  // The status refreshes in the background: once the app shows up as connected, its steps are
  // over and the list (now with "Connected") takes their place.
  if (showEmailCode && emailChannel) {
    return (
      <EmailCodeCard
        status={status}
        address={emailSentTo || emailChannel.address || 'your email'}
        code={emailCode}
        invalid={emailCodeInvalid}
        locked={emailCodeLocked}
        busy={busy}
        cooldownUntil={emailCooldownUntil}
        error={error}
        onCodeChange={(value) => {
          setEmailCode(value);
          setEmailCodeInvalid(false);
        }}
        onComplete={(value) => void submitEmailCode(value)}
        onSendAgain={() => {
          if (emailSentTo) {
            void handleConnect('email', emailSentTo);

            return;
          }

          setEditingEmail(true);
          setView('email');
        }}
        onBack={leaveEmailCode}
      />
    );
  }

  const stepsFor = status.channels.find((channel) => channel.via === view && !channel.connected)?.via;
  const connecting = connectingStep({
    status,
    stepsFor,
    telegramLink,
    telegramBot,
    busy,
    slackStarted,
    connectingVia,
    error,
    onConnect: (via, address) => void handleConnect(via, address),
    onBack: showChannels,
  });

  if (connecting) {
    return connecting;
  }

  return (
    <InviteCard step="channels">
      <InviterLine name={status.inviterName} agentPictureUrl={status.agentPictureUrl} />
      <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">Talk to {status.agentName}</h1>
      <CardText>
        {anyConnected
          ? `You're connected. ${status.agentName} messages you on your default channel.`
          : `Pick where you and ${status.agentName} talk.`}
      </CardText>

      {status.channels.length > 0 ? (
        <ul aria-label="Apps you can connect" className="flex flex-col gap-5.5">
          {status.channels.map((channel) => (
            <ChannelRow
              key={channel.via}
              channel={channel}
              description={
                !channel.available ? 'Not available on this setup yet' : channelDescription(channel, telegramBot)
              }
              connecting={connectingVia === channel.via}
              settingDefault={defaultingVia === channel.via}
              disabled={busy || !channel.available}
              onConnect={() =>
                openInviteChannel(channel, emailSentTo || readRememberedEmail(token), {
                  connectTelegram: () => void handleConnect('telegram'),
                  clearError: () => setErrorMessage(null),
                  editEmail: (editing) => {
                    setDismissedEmailCode(false);
                    setEditingEmail(editing);
                  },
                  show: setView,
                })
              }
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
        <Button className="w-full" disabled={busy} onClick={() => setView('done')}>
          Done
        </Button>
      )}

      <div className="flex flex-col gap-1.5">
        {status.channels.length > 0 && (
          <p className="text-xs leading-4 text-muted">By connecting, you let {status.agentName} message you there.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <ExpiryNote expiresAt={status.expiresAt} />
          {!anyConnected && (
            <button
              type="button"
              className="cursor-pointer rounded-sm text-xs leading-4 text-muted underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              disabled={busy}
              aria-busy={declining || undefined}
              onClick={handleDecline}
            >
              No thanks{declining && '…'}
            </button>
          )}
        </div>
      </div>
    </InviteCard>
  );
}

function connectingStep({
  status,
  stepsFor,
  telegramLink,
  telegramBot,
  busy,
  slackStarted,
  connectingVia,
  error,
  onConnect,
  onBack,
}: {
  status: ActiveInviteStatus;
  stepsFor: InviteChannelVia | undefined;
  telegramLink: string | null;
  telegramBot: string | undefined;
  busy: boolean;
  slackStarted: boolean;
  connectingVia: InviteChannelVia | null;
  error: ReactNode;
  onConnect: (via: InviteChannelVia, address?: string) => void;
  onBack: () => void;
}): ReactNode {
  if (stepsFor === 'telegram' && telegramLink) {
    return (
      <InviteCard step="telegram">
        <InviterLine name={status.inviterName} agentPictureUrl={status.agentPictureUrl} />
        <AppIcon via="telegram" size="large" />
        <StepTitle>Open the bot and press Start</StepTitle>
        <CardText>This lets {telegramBot ? `@${telegramBot}` : 'the bot'} message you.</CardText>

        <div className="flex items-center gap-4">
          <TelegramQrCode url={telegramLink} bot={telegramBot} />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <a href={telegramLink} target="_blank" rel="noopener noreferrer" className={buttonClassName('primary')}>
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              Open in Telegram
            </a>
            <p className="hidden text-xs leading-4 text-muted sm:block">Or scan with your phone</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <WaitingLine>Waiting for connection…</WaitingLine>
          <p className="text-xs leading-4 text-muted">
            The link works for 10 minutes.{' '}
            <button
              type="button"
              className="cursor-pointer rounded-sm text-secondary underline underline-offset-4 transition-colors duration-150 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              disabled={busy}
              onClick={() => onConnect('telegram')}
            >
              Get a new one
            </button>
          </p>
        </div>

        {error}
        <Button variant="secondary" className={cn(SMALL_BUTTON, 'self-start')} onClick={onBack}>
          Choose another way
        </Button>
      </InviteCard>
    );
  }

  if (stepsFor === 'slack') {
    return (
      <InviteCard step="slack">
        <InviterLine name={status.inviterName} agentPictureUrl={status.agentPictureUrl} />
        <AppIcon via="slack" size="large" />
        <StepTitle>Confirm your Slack account</StepTitle>
        <CardText>Sign in to Slack so {status.agentName} can DM you.</CardText>

        <Button
          className="self-start"
          pending={connectingVia === 'slack'}
          disabled={busy}
          onClick={() => onConnect('slack')}
        >
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Continue with Slack
        </Button>
        {slackStarted && <WaitingLine>Waiting for Slack…</WaitingLine>}

        {error}
        <Button variant="secondary" className={cn(SMALL_BUTTON, 'self-start')} onClick={onBack}>
          Choose another way
        </Button>
      </InviteCard>
    );
  }

  const emailChannel = status.channels.find((channel) => channel.via === 'email');

  if (stepsFor === 'email' && emailChannel) {
    return (
      <InviteCard step="email">
        <InviterLine name={status.inviterName} agentPictureUrl={status.agentPictureUrl} />
        <AppIcon via="email" size="large" />
        <StepTitle>Where should it email you?</StepTitle>
        <EmailAddressForm
          connecting={connectingVia === 'email'}
          disabled={busy}
          onSend={(address) => onConnect('email', address)}
        />
        {error}
        <Button variant="secondary" className={cn(SMALL_BUTTON, 'self-start')} onClick={onBack}>
          Choose another way
        </Button>
      </InviteCard>
    );
  }

  return null;
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

function openInviteChannel(
  channel: InviteChannel,
  rememberedEmail: string,
  actions: {
    connectTelegram: () => void;
    clearError: () => void;
    editEmail: (editing: boolean) => void;
    show: (via: InviteChannelVia) => void;
  }
) {
  if (!channel.available) {
    return;
  }

  // Telegram needs its link before there is anything to show. Slack mints its link on the next card.
  if (channel.via === 'telegram') {
    actions.connectTelegram();

    return;
  }

  actions.clearError();
  if (channel.via === 'email') {
    actions.editEmail(channel.status === 'pending' && !rememberedEmail);
  }
  actions.show(channel.via);
}

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
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3.5">
      <AppIcon via={channel.via} />
      <div className="min-w-0 flex-1 basis-28">
        <p className="text-[13px] leading-4.5 font-medium">{label}</p>
        <p className="text-xs leading-4 text-muted">{description}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {channel.connected && <Badge variant="success">Connected</Badge>}

        {channel.connected && channel.isDefault && <Badge variant="accent">Default</Badge>}

        {channel.connected && !channel.isDefault && (
          <Button
            variant="secondary"
            className={SMALL_BUTTON}
            // No pending ellipsis here: a wider button would push the row onto two lines.
            aria-busy={settingDefault || undefined}
            disabled={disabled}
            onClick={onMakeDefault}
            aria-label={`Make ${label} your default`}
          >
            Make default
          </Button>
        )}

        {!channel.connected && (
          <Button
            variant="secondary"
            className={SMALL_BUTTON}
            aria-busy={connecting || undefined}
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
    <div className="relative hidden shrink-0 rounded-lg bg-foreground p-2 sm:block">
      {/* Level Q keeps the code readable with the mark covering its center. */}
      <QRCode
        value={url}
        size={80}
        level="Q"
        bgColor="#ebe2d6"
        fgColor="#0a0908"
        aria-label={`QR code that opens ${bot ? `@${bot}` : 'the bot'} in Telegram`}
      />
      <AppIcon via="telegram" className="absolute top-1/2 left-1/2 size-6 -translate-1/2 ring-2 ring-foreground" />
    </div>
  );
}

type DoneCardProps = {
  agentName: string;
  inviteeName: string;
  /** The app shown in the example message. */
  via: InviteChannelVia;
  /** Whether asks go to that app by default. */
  isDefault: boolean;
  telegramBot?: string;
  /** Back to the list of apps, to connect another one or change the default. */
  onBack: () => void;
};

function DoneCard({ agentName, inviteeName, via, isDefault, telegramBot, onBack }: DoneCardProps) {
  const firstName = inviteeName.trim().split(/\s+/)[0];
  const sender = via === 'telegram' && telegramBot ? `@${telegramBot}` : APP_LABELS[via];

  return (
    <>
      <MascotFace art="waiting" mood="happy" className="size-35" />
      <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
        You&apos;re in{firstName && ', '}
        {firstName && <Accent>{firstName}</Accent>}
      </h1>
      <CardText>
        When {agentName} needs you{isDefault && ` on ${APP_LABELS[via]}`}, it looks like this:
      </CardText>

      <figure
        aria-label="Example message"
        className="flex flex-col gap-2.5 rounded-lg border border-border bg-subtle p-4"
      >
        <figcaption className="flex items-center gap-2 font-mono text-[11px] leading-4 text-muted">
          <AppIcon via={via} size="small" />
          {sender}
        </figcaption>
        <p className="text-[13px] leading-4.5">Your September invoice is ready. Want it as a PDF?</p>
        {/* A picture of the buttons in the chat app, not something to press here. */}
        <div aria-hidden="true" className="flex gap-2 text-[13px] leading-4.5 font-medium select-none">
          <span className="flex h-7 items-center rounded bg-accent px-2.5 text-background">Approve</span>
          <span className="flex h-7 items-center rounded bg-background px-2.5 ring-1 ring-border ring-inset">Deny</span>
        </div>
      </figure>

      <p className="text-xs leading-4 text-muted">
        You can close this tab, or{' '}
        <button
          type="button"
          className="cursor-pointer rounded-sm text-secondary underline underline-offset-4 transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
          onClick={onBack}
        >
          go back to your apps
        </button>
        .
      </p>
    </>
  );
}

function InactiveInvite({ reason, agentName }: { reason: InactiveReason; agentName?: string }) {
  const { title, text } = inactiveCopy(reason, agentName);

  return (
    <>
      <img src="/illustrations/state-error.svg" alt="" width={120} height={120} className="size-30" />
      <StepTitle>{title}</StepTitle>
      <CardText>{text}</CardText>
    </>
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

type InviteCardProps = {
  /** Names the view inside. A new one fades in while the card moves to its height. */
  step: string;
  children: ReactNode;
};

/**
 * The one card of the page, 480px wide with everything inside 22px apart and the dithered glow in its
 * top right corner. Moving to another step keeps the card and animates it to the new height.
 */
function InviteCard({ step, children }: InviteCardProps) {
  const { ref, height } = useMeasuredHeight();

  return (
    <div
      // The border is part of the height; the measured content isn't.
      style={height === undefined ? undefined : { height: height + 2 }}
      className="relative isolate w-full max-w-120 overflow-hidden rounded-xl border border-border bg-background transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      {/* `Dither` from the design system, exported as it is: 480x320 against the card's top right corner. */}
      <img
        src="/illustrations/dither-corner.svg"
        alt=""
        width={480}
        height={320}
        className="pointer-events-none absolute top-0 right-0 -z-10 h-80 w-120 max-w-none animate-breathe select-none motion-reduce:animate-none"
      />
      <div ref={ref}>
        <div key={step} className="flex animate-rise-in flex-col gap-5.5 p-5 motion-reduce:animate-none sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The title of a step or of a card that ends the invite. The list of apps and the goodbye use a larger one. */
function StepTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-base leading-6 font-medium">{children}</h1>;
}

function CardText({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-4.5 text-secondary">{children}</p>;
}

/** The accent word of a heading, in the italic display face. */
function Accent({ children }: { children: ReactNode }) {
  return <em className="font-display text-[26px] tracking-[-0.75px] text-accent">{children}</em>;
}

/** Who is asking: a person and their agent. An account owner who never gave a name isn't named. */
function InviterLine({ name, agentPictureUrl }: { name?: string; agentPictureUrl?: string }) {
  return (
    <div className="flex h-8 items-center gap-2.5">
      <span aria-hidden="true" className="flex shrink-0 items-center">
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-raised text-secondary">
          <User className="size-4" />
        </span>
        <AgentAvatar src={agentPictureUrl} className="-ml-2.5 size-8 rounded-full ring-2 ring-background" />
      </span>
      <p className="text-[13px] leading-4.5 text-secondary">{name ? `${name} invited you` : "You've been invited"}</p>
    </div>
  );
}

function WaitingLine({ children }: { children: ReactNode }) {
  return (
    <output className="flex items-center gap-2 text-xs leading-4 text-secondary">
      <span aria-hidden="true" className="flex size-4 items-center justify-center">
        <span className="size-2 animate-pulse rounded-full bg-accent shadow-[0_0_0_4px_rgb(242_173_64/0.45)] motion-reduce:animate-none" />
      </span>
      {children}
    </output>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-accent/10 px-3 py-2 text-[13px] leading-4.5 text-foreground ring-1 ring-accent/40"
    >
      {children}
    </p>
  );
}

function EmailAddressForm({
  connecting,
  disabled,
  onSend,
}: {
  connecting: boolean;
  disabled: boolean;
  onSend: (address: string) => void;
}) {
  const [address, setAddress] = useState('');
  const value = address.trim();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value) {
          return;
        }

        onSend(value);
      }}
    >
      <Field label="Your email" hint="We’ll send a 6-digit code to confirm it’s you.">
        {(props) => (
          <Input
            {...props}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={address}
            disabled={disabled}
            onChange={(event) => setAddress(event.target.value)}
          />
        )}
      </Field>
      <Button type="submit" className="w-full" pending={connecting} disabled={disabled || !value}>
        Send code
      </Button>
    </form>
  );
}

function EmailCodeCard({
  status,
  address,
  code,
  invalid,
  locked,
  busy,
  cooldownUntil,
  error,
  onCodeChange,
  onComplete,
  onSendAgain,
  onBack,
}: {
  status: ActiveInviteStatus;
  address: string;
  code: string;
  invalid: boolean;
  locked: boolean;
  busy: boolean;
  cooldownUntil: number | null;
  error: ReactNode;
  onCodeChange: (value: string) => void;
  onComplete: (value: string) => void;
  onSendAgain: () => void;
  onBack: () => void;
}) {
  const cooldownSeconds = useCooldownSeconds(cooldownUntil);

  return (
    <InviteCard step="email-code">
      <InviterLine name={status.inviterName} agentPictureUrl={status.agentPictureUrl} />
      <AppIcon via="email" size="large" />
      <StepTitle>Check your inbox</StepTitle>
      <CardText>Enter the code we sent to {address}</CardText>
      <CodeInput
        value={code}
        onChange={onCodeChange}
        onComplete={onComplete}
        label="Code from the email"
        size="lg"
        invalid={invalid}
        disabled={busy || (locked && cooldownSeconds > 0)}
        autoFocus
      />
      {error}
      <div className="flex items-center gap-1">
        <p className="text-xs leading-4 text-muted">Didn’t get it?</p>
        <Button variant="quiet" className={SMALL_BUTTON} disabled={busy || cooldownSeconds > 0} onClick={onSendAgain}>
          {cooldownSeconds > 0 ? `Send again in ${cooldownSeconds}s` : 'Send again'}
        </Button>
      </div>
      <Button variant="secondary" className={cn(SMALL_BUTTON, 'self-start')} onClick={onBack}>
        Choose another way
      </Button>
    </InviteCard>
  );
}

function useCooldownSeconds(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until || until <= Date.now()) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [until]);

  if (!until) {
    return 0;
  }

  return Math.max(0, Math.ceil((until - now) / 1000));
}

function ExpiryNote({ expiresAt }: { expiresAt: string }) {
  const expiry = new Date(expiresAt);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const absolute = expiry.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <p className="text-xs leading-4 text-muted" title={absolute}>
      This link expires {relativeTime(expiry)}.
    </p>
  );
}

function channelDescription(channel: InviteChannel, telegramBot?: string): string {
  switch (channel.via) {
    case 'telegram':
      return telegramBot ? `Chat with @${telegramBot}` : 'Chat in Telegram';
    case 'slack':
      return 'Message it in Slack';
    case 'email':
      if (channel.status === 'pending') {
        return channel.address ? `Check your inbox at ${channel.address}` : 'Check your inbox for a code';
      }

      if (channel.connected && channel.address) {
        return channel.address;
      }

      return 'Email it';
    default: {
      const unreachable: never = channel.via;

      return unreachable;
    }
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
