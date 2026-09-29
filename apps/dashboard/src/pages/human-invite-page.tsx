import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { RiCheckLine, RiErrorWarningLine, RiTimeLine } from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import {
  connectHumanInviteChannel,
  declineHumanInvite,
  getHumanInviteStatus,
  type HumanInviteChannel,
  type HumanInviteChannelVia,
  HumanInviteRequestError,
  type HumanInviteStatus,
  setHumanInviteDefaultChannel,
} from '@/api/agents';
import { Card, PageShell } from '@/components/agents/public-token-page';
import { TelegramQrInline } from '@/components/agents/telegram-setup-guide';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';

const STATUS_POLL_INTERVAL_MS = 3_000;

const CHANNEL_META: Record<HumanInviteChannelVia, { label: string; providerId: string; hint: string }> = {
  telegram: { label: 'Telegram', providerId: 'telegram', hint: 'Scan a code with your phone, or open Telegram here.' },
  slack: { label: 'Slack', providerId: 'slack', hint: 'Approve the app in your Slack workspace.' },
};

type ValidInviteStatus = Extract<HumanInviteStatus, { valid: true }>;

type InactiveReason = 'expired' | 'declined' | 'invalid';

/**
 * Public, unauthenticated page opened by a human invited via `human invite`.
 * Authorization is carried by the opaque token in the URL. The person picks
 * which of the inviter's channels (Telegram, Slack) the agent may reach them
 * on, and which one is the default; the page polls the invite status so rows
 * flip to "Connected" once they finish in Telegram or Slack.
 */
export function HumanInvitePage() {
  const { token = '' } = useParams<{ token: string }>();

  const statusQuery = useQuery<HumanInviteStatus>({
    queryKey: ['human-invite-status', token],
    queryFn: ({ signal }) => getHumanInviteStatus(token, signal),
    enabled: token.length > 0,
    retry: false,
    // Keep checking while the link is usable, and re-check as soon as the person comes back to this tab
    // from Telegram or Slack.
    refetchInterval: (query) => (query.state.data?.valid ? STATUS_POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
    meta: { showError: false },
  });

  const status = statusQuery.data;

  return (
    <PageShell>
      {!token && <InactiveLinkCard reason="invalid" />}
      {token && statusQuery.isLoading && <LoadingCard />}
      {/* A failed background poll keeps the last known status on screen. */}
      {token && statusQuery.isError && !status && <InactiveLinkCard reason="invalid" />}
      {token && status && !status.valid && <InactiveLinkCard reason={status.reason} />}
      {token && status?.valid && (
        <InviteCard token={token} status={status} onChanged={() => void statusQuery.refetch()} />
      )}
    </PageShell>
  );
}

function LoadingCard() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          className="border-stroke-soft border-t-text-strong size-7 animate-spin rounded-full border-2"
          aria-hidden="true"
        />
        <p className="text-text-soft text-paragraph-xs">Checking your invitation…</p>
      </div>
    </Card>
  );
}

type InviteCardProps = {
  token: string;
  status: ValidInviteStatus;
  onChanged: () => void;
};

function InviteCard({ token, status, onChanged }: InviteCardProps) {
  const [declined, setDeclined] = useState(false);
  const [inactiveReason, setInactiveReason] = useState<InactiveReason | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

  const connectMutation = useMutation<{ url: string }, Error, { via: HumanInviteChannelVia }>({
    mutationFn: ({ via }) => connectHumanInviteChannel(token, via),
  });

  const defaultMutation = useMutation<{ defaultVia: HumanInviteChannelVia }, Error, { via: HumanInviteChannelVia }>({
    mutationFn: ({ via }) => setHumanInviteDefaultChannel(token, via),
  });

  const declineMutation = useMutation<{ declined: true }, Error, void>({
    mutationFn: () => declineHumanInvite(token),
  });

  if (declined) {
    return <DeclinedCard agentName={status.agentName} />;
  }

  if (inactiveReason) {
    return <InactiveLinkCard reason={inactiveReason} />;
  }

  const handleError = (error: Error) => {
    if (error instanceof HumanInviteRequestError) {
      if (error.code === 'token_expired') {
        setInactiveReason('expired');

        return;
      }

      if (error.code === 'token_invalid') {
        setInactiveReason('invalid');

        return;
      }

      if (error.code === 'invite_declined') {
        setInactiveReason('declined');

        return;
      }

      if (error.code === 'channel_already_connected') {
        onChanged();

        return;
      }
    }

    setErrorMessage(error.message);
  };

  const handleConnect = (via: HumanInviteChannelVia) => {
    setErrorMessage(null);

    // t.me hands off to the app through a `tg://` link, which fails on a computer without Telegram
    // installed, so show the link as a QR code for the phone next to a button that opens it here.
    if (via === 'telegram') {
      connectMutation.mutate({ via }, { onSuccess: ({ url }) => setTelegramLink(url), onError: handleError });

      return;
    }

    // Open the tab synchronously inside the click so the browser doesn't block it as a popup; it is
    // pointed at Slack once the freshly minted link arrives.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;

    connectMutation.mutate(
      { via },
      {
        onSuccess: ({ url }) => {
          if (tab && !tab.closed) {
            tab.location.href = url;
          } else {
            window.location.assign(url);
          }
        },
        onError: (error) => {
          tab?.close();
          handleError(error);
        },
      }
    );
  };

  const handleMakeDefault = (via: HumanInviteChannelVia) => {
    setErrorMessage(null);
    defaultMutation.mutate({ via }, { onSuccess: onChanged, onError: handleError });
  };

  const handleDecline = () => {
    setErrorMessage(null);
    declineMutation.mutate(undefined, { onSuccess: () => setDeclined(true), onError: handleError });
  };

  const isBusy = connectMutation.isPending || defaultMutation.isPending || declineMutation.isPending;
  const connectingVia = connectMutation.isPending ? connectMutation.variables?.via : undefined;
  const defaultingVia = defaultMutation.isPending ? defaultMutation.variables?.via : undefined;
  const anyConnected = status.channels.some((channel) => channel.connected);

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <p className="text-text-soft text-label-xs uppercase tracking-wide">Invitation</p>
        <h1 className="text-text-strong text-paragraph-md font-medium leading-snug">
          Hi <span className="font-semibold">{status.inviteeName}</span>
        </h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          <span className="text-text-strong font-medium">{status.agentName}</span> would like to be able to reach you.
          Choose how:
        </p>
      </div>

      {status.channels.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2">
          {status.channels.map((channel) => (
            <ChannelRow
              key={channel.via}
              channel={channel}
              isConnecting={connectingVia === channel.via}
              isSettingDefault={defaultingVia === channel.via}
              link={channel.via === 'telegram' ? telegramLink : null}
              disabled={isBusy}
              onConnect={() => handleConnect(channel.via)}
              onMakeDefault={() => handleMakeDefault(channel.via)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-text-soft text-paragraph-xs mt-5 leading-5">
          There&apos;s no way to connect right now. Ask the person who invited you to check their setup.
        </p>
      )}

      {errorMessage && (
        <div className="border-error-base bg-error-base/5 text-error-base mt-4 flex items-start gap-2 rounded-md border p-2.5">
          <RiErrorWarningLine className="mt-0.5 size-4 shrink-0" />
          <p className="text-paragraph-xs leading-5">{errorMessage}</p>
        </div>
      )}

      {!anyConnected && (
        <Button
          variant="secondary"
          mode="ghost"
          size="sm"
          className="mt-3 w-full"
          isLoading={declineMutation.isPending}
          disabled={isBusy}
          onClick={handleDecline}
        >
          No thanks
        </Button>
      )}

      <ExpiryNote expiresAt={status.expiresAt} anyConnected={anyConnected} />
    </Card>
  );
}

type ChannelRowProps = {
  channel: HumanInviteChannel;
  isConnecting: boolean;
  isSettingDefault: boolean;
  /** Freshly minted connect link, shown in the row instead of opening a tab (Telegram). */
  link: string | null;
  disabled: boolean;
  onConnect: () => void;
  onMakeDefault: () => void;
};

function ChannelRow({
  channel,
  isConnecting,
  isSettingDefault,
  link,
  disabled,
  onConnect,
  onMakeDefault,
}: ChannelRowProps) {
  const meta = CHANNEL_META[channel.via];
  const showLink = Boolean(link) && !channel.connected;

  return (
    <li className="border-stroke-soft flex flex-col rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <ProviderIcon providerId={meta.providerId} providerDisplayName={meta.label} className="size-8" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-text-strong text-label-sm font-medium">{meta.label}</span>
            {channel.connected && channel.isDefault && (
              <Badge color="green" variant="lighter" size="sm">
                Default
              </Badge>
            )}
          </div>
          <span className="text-text-soft text-paragraph-xs leading-4">
            {channel.connected ? 'Connected' : meta.hint}
          </span>
        </div>

        {!channel.connected && !showLink && (
          <Button
            variant="primary"
            mode="filled"
            size="xs"
            isLoading={isConnecting}
            disabled={disabled}
            onClick={onConnect}
          >
            Connect
          </Button>
        )}

        {channel.connected && !channel.isDefault && (
          <Button
            variant="secondary"
            mode="outline"
            size="xs"
            isLoading={isSettingDefault}
            disabled={disabled}
            onClick={onMakeDefault}
          >
            Make default
          </Button>
        )}

        {channel.connected && channel.isDefault && (
          <RiCheckLine className="text-success-base size-5 shrink-0" aria-label="Connected" />
        )}
      </div>

      {showLink && link && (
        <TelegramLinkPanel url={link} isRefreshing={isConnecting} disabled={disabled} onRefresh={onConnect} />
      )}
    </li>
  );
}

type TelegramLinkPanelProps = {
  url: string;
  isRefreshing: boolean;
  disabled: boolean;
  onRefresh: () => void;
};

function TelegramLinkPanel({ url, isRefreshing, disabled, onRefresh }: TelegramLinkPanelProps) {
  return (
    <div className="mt-3 flex flex-col items-center gap-3">
      {/* On a phone the code is no use: the button opens the Telegram app directly. */}
      <div className="hidden sm:block">
        <TelegramQrInline url={url} username={telegramBotUsername(url)} />
      </div>
      <Button asChild variant="secondary" mode="outline" size="xs">
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open Telegram on this device
        </a>
      </Button>
      <p className="text-text-soft text-paragraph-xs text-center leading-4">
        Then tap Start. The code works for 10 minutes.{' '}
        <button
          type="button"
          className="text-text-sub underline underline-offset-2 disabled:opacity-50"
          disabled={disabled || isRefreshing}
          onClick={onRefresh}
        >
          Get a new code
        </button>
      </p>
    </div>
  );
}

/** `https://t.me/novu_bot?start=…` → `novu_bot`. */
function telegramBotUsername(url: string): string | undefined {
  try {
    return new URL(url).pathname.replace(/^\//, '') || undefined;
  } catch {
    return undefined;
  }
}

function ExpiryNote({ expiresAt, anyConnected }: { expiresAt: string; anyConnected: boolean }) {
  const expiry = new Date(expiresAt);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const relative = formatDistanceToNow(expiry, { addSuffix: true });
  const absolute = expiry.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <p className="text-text-soft text-label-xs mt-5 text-center leading-4">
      This link expires {relative} ({absolute}).
      {anyConnected && ' You can connect more apps from this page until then.'}
    </p>
  );
}

function DeclinedCard({ agentName }: { agentName?: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-bg-weak text-text-sub flex size-12 items-center justify-center rounded-full">
          <RiCheckLine className="size-6" />
        </div>
        <h1 className="text-text-strong text-paragraph-md font-semibold">Got it</h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          {agentName ? (
            <>
              <span className="text-text-strong font-medium">{agentName}</span> won&apos;t contact you through this
              link.
            </>
          ) : (
            "You won't be contacted through this link."
          )}
        </p>
      </div>
      <p className="text-text-soft text-label-xs mt-5 text-center">You can safely close this tab.</p>
    </Card>
  );
}

function InactiveLinkCard({ reason }: { reason: InactiveReason }) {
  if (reason === 'declined') {
    return <DeclinedCard />;
  }

  const copy = reasonCopy(reason);

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-warning-base/10 text-warning-base flex size-12 items-center justify-center rounded-full">
          <RiTimeLine className="size-6" />
        </div>
        <h1 className="text-text-strong text-paragraph-md font-semibold">{copy.title}</h1>
        <p className="text-text-soft text-paragraph-xs leading-5">{copy.description}</p>
      </div>
    </Card>
  );
}

function reasonCopy(reason: Exclude<InactiveReason, 'declined'>): { title: string; description: string } {
  switch (reason) {
    case 'expired':
      return {
        title: 'This invitation has expired',
        description: 'Invitation links work for a limited time. Ask the person who invited you to send a new one.',
      };
    case 'invalid':
    default:
      return {
        title: 'This invitation link is no longer valid',
        description:
          'The link may be incomplete or already replaced. Ask the person who invited you to send a new one.',
      };
  }
}
