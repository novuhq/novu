'use client';

import { useRef, useState } from 'react';

import { ChannelRow, channelDescription } from '@/components/invite/channel-row';
import { DoneCard } from '@/components/invite/done-card';
import { ExpiryNote } from '@/components/invite/expiry-note';
import { InactiveInvite, type InactiveReason } from '@/components/invite/inactive-invite';
import { CardText, ErrorNote, InviteCard, InviterLine, StepTitle } from '@/components/invite/invite-card';
import { connectStep } from '@/components/invite/steps/connect-step';
import { telegramBotUsername } from '@/components/invite/steps/telegram-step';
import { Button } from '@/components/ui/button';
import { useInviteStatus } from '@/hooks/use-invite-status';
import {
  type ActiveInviteStatus,
  type ConnectInviteResult,
  confirmInviteVoiceCode,
  connectInviteChannel,
  declineInvite,
  type InviteChannelVia,
  InviteRequestError,
  removeInviteVoice,
  setInviteDefaultChannel,
} from '@/lib/invite-api';

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
    onVoiceCalled: (retryAfterSeconds: number) => void;
    onTelegram: (url: string) => void;
  }
): void {
  if ('via' in result && result.via === 'email') {
    actions.onEmailSent(result.retryAfterSeconds);

    return;
  }

  if ('via' in result && result.via === 'voice') {
    actions.onVoiceCalled(result.retryAfterSeconds);

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
  // Keyed by channel: a rate-limited voice call must not disable the email button.
  const [cooldownUntil, setCooldownUntil] = useState<Partial<Record<InviteChannelVia, number>>>({});
  const [voiceCallPlaced, setVoiceCallPlaced] = useState(false);
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

  const startCooldown = (via: InviteChannelVia, retryAfterSeconds: number) => {
    setCooldownUntil((current) => ({ ...current, [via]: Date.now() + retryAfterSeconds * 1000 }));
  };

  /** `via` is the channel the failed request was for, so a cooldown lands on its own button. */
  const handleError = (error: unknown, via?: InviteChannelVia) => {
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
          if (via && error.retryAfterSeconds) {
            startCooldown(via, error.retryAfterSeconds);
          }
          setErrorMessage(error.message);

          return;
      }
    }

    setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.');
  };

  const handleConnect = async (via: InviteChannelVia, address?: string) => {
    setErrorMessage(null);

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
          startCooldown('email', retryAfterSeconds);
          onChanged();
        },
        onVoiceCalled: (retryAfterSeconds) => {
          setVoiceCallPlaced(true);
          startCooldown('voice', retryAfterSeconds);
          onChanged();
        },
        onTelegram: (url) => {
          setTelegramLink(url);
          setView('telegram');
        },
      });
    } catch (error) {
      tab?.close();
      handleError(error, via);
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

  const handleConfirmVoice = async (code: string): Promise<boolean> => {
    setErrorMessage(null);
    setConfirmingCode(true);
    try {
      await confirmInviteVoiceCode(apiUrl, token, code);
      onChanged();

      return true;
    } catch (error) {
      handleError(error, 'voice');

      return false;
    } finally {
      setConfirmingCode(false);
    }
  };

  const handleRemoveVoice = async () => {
    setErrorMessage(null);
    setConfirmingCode(true);
    try {
      await removeInviteVoice(apiUrl, token);
      setVoiceCallPlaced(false);
      onChanged();
    } catch (error) {
      handleError(error, 'voice');
    } finally {
      setConfirmingCode(false);
    }
  };

  const showChannels = () => {
    navigations.current += 1;
    setErrorMessage(null);
    setView('channels');
  };

  const busy = connectingVia !== null || defaultingVia !== null || declining || confirmingCode;
  const connectedChannels = status.channels.filter((channel) => channel.connected);
  const anyConnected = connectedChannels.length > 0;
  const telegramBot = telegramLink ? telegramBotUsername(telegramLink) : undefined;
  const error = errorMessage && <ErrorNote>{errorMessage}</ErrorNote>;

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
  const connecting = connectStep({
    status,
    via: status.channels.find((channel) => channel.via === view && !channel.connected)?.via,
    telegramLink,
    busy,
    connectingVia,
    slackStarted,
    cooldownUntil,
    voiceCallPlaced,
    confirmingCode,
    error,
    onConnect: (via, address) => void handleConnect(via, address),
    onConfirmVoice: handleConfirmVoice,
    onRemoveVoice: () => void handleRemoveVoice(),
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
              onConnect={() => {
                if (!channel.available) {
                  return;
                }

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
              onRemove={channel.via === 'voice' && channel.connected ? () => void handleRemoveVoice() : undefined}
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
