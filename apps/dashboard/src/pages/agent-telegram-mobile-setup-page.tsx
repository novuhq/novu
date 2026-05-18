import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  RiAlertLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiSendPlaneLine,
  RiTimeLine,
} from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import {
  getTelegramMobileSetupStatus,
  submitTelegramMobileCredentials,
  type SubmitTelegramMobileCredentialsResult,
  type TelegramMobileLinkStatus,
  TelegramMobileSubmitError,
} from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { Textarea } from '@/components/primitives/textarea';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { isValidBotToken, parseBotFatherMessage } from '@/utils/telegram-bot-token';
import { cn } from '@/utils/ui';

const PARSE_DEBOUNCE_MS = 300;

export function AgentTelegramMobileSetupPage() {
  const { token = '' } = useParams<{ token: string }>();

  const statusQuery = useQuery<TelegramMobileLinkStatus>({
    queryKey: ['telegram-mobile-setup-status', token],
    queryFn: ({ signal }) => getTelegramMobileSetupStatus(token, signal),
    enabled: token.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { showError: false },
  });

  return (
    <PageShell>
      {!token && <InactiveLinkCard reason="invalid" />}
      {token && statusQuery.isLoading && <LoadingCard />}
      {token && statusQuery.data && !statusQuery.data.valid && (
        <InactiveLinkCard reason={statusQuery.data.reason} />
      )}
      {token && statusQuery.isError && <InactiveLinkCard reason="invalid" />}
      {token && statusQuery.data?.valid && <SetupForm token={token} agentName={statusQuery.data.agentName} />}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-weak flex min-h-dvh flex-col items-center justify-between px-4 py-8">
      <div className="w-full max-w-md flex-1 pt-[max(env(safe-area-inset-top),0px)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
      <PoweredByNovu />
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="border-stroke-soft border-t-text-strong size-7 animate-spin rounded-full border-2" aria-label="Loading" />
        <p className="text-text-soft text-paragraph-xs">Checking your setup link…</p>
      </div>
    </Card>
  );
}

type SetupFormProps = {
  token: string;
  agentName: string;
};

function SetupForm({ token, agentName }: SetupFormProps) {
  const [draft, setDraft] = useState('');
  const debouncedDraft = useDebouncedValue(draft, PARSE_DEBOUNCE_MS);

  const parsed = useMemo(() => parseBotFatherMessage(debouncedDraft), [debouncedDraft]);
  const parsedToken = parsed.token && isValidBotToken(parsed.token) ? parsed.token : null;
  const parsedUsername = parsed.botUsername;

  const submitMutation = useMutation<
    SubmitTelegramMobileCredentialsResult,
    TelegramMobileSubmitError | Error,
    { botToken: string }
  >({
    mutationFn: ({ botToken }) => submitTelegramMobileCredentials(token, botToken),
  });

  if (submitMutation.data?.success) {
    return <SuccessCard botUsername={submitMutation.data.botUsername} agentName={agentName} />;
  }

  if (submitMutation.error instanceof TelegramMobileSubmitError) {
    const code = submitMutation.error.code;
    if (code === 'token_already_used') return <InactiveLinkCard reason="used" />;
    if (code === 'token_expired') return <InactiveLinkCard reason="expired" />;
    if (code === 'token_invalid') return <InactiveLinkCard reason="invalid" />;
  }

  const errorMessage = submitMutation.error instanceof Error ? submitMutation.error.message : null;

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <p className="text-text-soft text-label-xs uppercase tracking-wide">Connect Telegram bot</p>
        <h1 className="text-text-strong text-paragraph-md font-medium leading-snug">
          Finish setup for <span className="text-text-strong font-semibold">{agentName}</span>
        </h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          Paste the message BotFather just sent you on Telegram. We&apos;ll detect the bot token and connect the
          webhook automatically — nothing else to fill in.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="bot-message" className="text-label-xs text-text-strong font-medium">
          BotFather confirmation message
        </label>
        <Textarea
          id="bot-message"
          simple
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={'Done! Congratulations on your new bot…\n\nUse this token to access the HTTP API:\n1234567890:AAFdT8_…\n\nYou will find it at t.me/YourBot_bot.'}
          rows={7}
          className={cn(
            'font-mono text-xs',
            parsedToken && 'border-success-base ring-success-base/40 ring-1'
          )}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <ParseStatus draft={debouncedDraft} parsedToken={parsedToken} parsedUsername={parsedUsername} />
      </div>

      {errorMessage && (
        <div className="border-error-base bg-error-base/5 text-error-base mt-4 flex items-start gap-2 rounded-md border p-2.5">
          <RiErrorWarningLine className="mt-0.5 size-4 shrink-0" />
          <p className="text-paragraph-xs leading-5">{errorMessage}</p>
        </div>
      )}

      <Button
        variant="primary"
        mode="filled"
        size="md"
        className="mt-5 w-full"
        isLoading={submitMutation.isPending}
        disabled={!parsedToken || submitMutation.isPending}
        onClick={() => {
          if (parsedToken) submitMutation.mutate({ botToken: parsedToken });
        }}
      >
        Connect bot
      </Button>
    </Card>
  );
}

type ParseStatusProps = {
  draft: string;
  parsedToken: string | null;
  parsedUsername: string | null;
};

function ParseStatus({ draft, parsedToken, parsedUsername }: ParseStatusProps) {
  if (!draft.trim()) return null;

  if (!parsedToken) {
    return (
      <div className="text-text-soft text-label-xs flex items-start gap-1.5 leading-4">
        <RiAlertLine className="text-warning-base mt-0.5 size-3.5 shrink-0" />
        <span>We couldn&apos;t find a bot token yet. Paste the entire message — it starts with &quot;Done!&quot;.</span>
      </div>
    );
  }

  return (
    <div className="text-success-base text-label-xs flex items-start gap-1.5 leading-4">
      <RiCheckLine className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Token detected{parsedUsername ? <> for <span className="font-semibold">@{parsedUsername}</span></> : null}.
      </span>
    </div>
  );
}

function SuccessCard({ botUsername, agentName }: { botUsername: string; agentName: string }) {
  const telegramUrl = `https://t.me/${botUsername}`;

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-success-base/10 text-success-base flex size-12 items-center justify-center rounded-full">
          <RiCheckLine className="size-6" />
        </div>
        <h1 className="text-text-strong text-paragraph-md font-semibold">@{botUsername} is connected</h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          Your Telegram bot is now wired up to <span className="text-text-strong font-medium">{agentName}</span>.
          Open it in Telegram to send your first message — your agent will reply.
        </p>
      </div>

      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-text-strong text-static-white hover:bg-text-strong/90 mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-10 px-3.5 text-label-sm transition"
      >
        <RiSendPlaneLine className="size-4" />
        Open @{botUsername}
      </a>

      <p className="text-text-soft text-label-xs mt-3 text-center">You can safely close this tab.</p>
    </Card>
  );
}

type InactiveReason = 'expired' | 'used' | 'invalid';

function InactiveLinkCard({ reason }: { reason: InactiveReason }) {
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

function reasonCopy(reason: InactiveReason): { title: string; description: string } {
  switch (reason) {
    case 'expired':
      return {
        title: 'This setup link has expired',
        description:
          'Setup links are valid for 5 minutes. Head back to your Novu dashboard and scan the refreshed QR code or copy a new link.',
      };
    case 'used':
      return {
        title: 'This setup link has already been used',
        description:
          'For security, each link works only once. Generate a fresh link from your Novu dashboard if you need to reconfigure the bot.',
      };
    case 'invalid':
    default:
      return {
        title: 'This setup link is no longer valid',
        description:
          'The link may be broken or for a different integration. Open your Novu dashboard and scan a fresh QR code to continue.',
      };
  }
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-stroke-soft bg-bg-white shadow-regular-xs flex w-full flex-col rounded-xl border p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

function PoweredByNovu() {
  return (
    <a
      href="https://novu.co"
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-soft hover:text-text-strong mt-8 inline-flex items-center gap-2 text-label-xs transition"
      aria-label="Powered by Novu"
    >
      <span>Powered by</span>
      <img src="/images/novu-logo-dark.svg" alt="Novu" className="h-3.5" />
    </a>
  );
}
