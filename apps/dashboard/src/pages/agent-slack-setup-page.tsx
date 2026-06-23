import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiCheckLine, RiErrorWarningLine, RiTimeLine } from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import {
  getSlackSetupStatus,
  type SlackSetupLinkStatus,
  SlackSetupSubmitError,
  type SubmitSlackSetupCredentialsResult,
  submitSlackSetupCredentials,
} from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { cn } from '@/utils/ui';

const SLACK_CONFIG_TOKEN_PREFIX = 'xoxe.xoxp-';

function isValidSlackConfigToken(value: string): boolean {
  return value.trim().startsWith(SLACK_CONFIG_TOKEN_PREFIX) && value.trim().length > SLACK_CONFIG_TOKEN_PREFIX.length;
}

export function AgentSlackSetupPage() {
  const { token = '' } = useParams<{ token: string }>();

  const statusQuery = useQuery<SlackSetupLinkStatus>({
    queryKey: ['slack-setup-status', token],
    queryFn: ({ signal }) => getSlackSetupStatus(token, signal),
    enabled: token.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { showError: false },
  });

  return (
    <PageShell>
      {!token && <InactiveLinkCard reason="invalid" />}
      {token && statusQuery.isLoading && <LoadingCard />}
      {token && statusQuery.data && !statusQuery.data.valid && <InactiveLinkCard reason={statusQuery.data.reason} />}
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
        <div
          className="border-stroke-soft border-t-text-strong size-7 animate-spin rounded-full border-2"
          aria-label="Loading"
        />
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
  const [configToken, setConfigToken] = useState('');
  const trimmedToken = configToken.trim();
  const tokenValid = isValidSlackConfigToken(trimmedToken);

  const submitMutation = useMutation<
    SubmitSlackSetupCredentialsResult,
    SlackSetupSubmitError | Error,
    { configToken: string }
  >({
    mutationFn: ({ configToken: value }) => submitSlackSetupCredentials(token, value),
  });

  if (submitMutation.data?.success) {
    return <SuccessCard agentName={agentName} />;
  }

  if (submitMutation.error instanceof SlackSetupSubmitError) {
    const code = submitMutation.error.code;
    if (code === 'token_already_used') return <InactiveLinkCard reason="used" />;
    if (code === 'token_expired') return <InactiveLinkCard reason="expired" />;
    if (code === 'token_invalid') return <InactiveLinkCard reason="invalid" />;
  }

  const errorMessage = submitMutation.error instanceof Error ? submitMutation.error.message : null;

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <p className="text-text-soft text-label-xs uppercase tracking-wide">Connect Slack</p>
        <h1 className="text-text-strong text-paragraph-md font-medium leading-snug">
          Finish setup for <span className="text-text-strong font-semibold">{agentName}</span>
        </h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          Paste your Slack App Configuration Token here. Novu uses it once to create the Slack app from a manifest, then
          discards it — your terminal will continue automatically.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="slack-config-token" className="text-label-xs text-text-strong font-medium">
          Slack App Configuration Token
        </label>
        <ol className="text-text-soft text-label-xs ml-4 list-decimal space-y-1 leading-4">
          <li>
            Open{' '}
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-strong underline"
            >
              api.slack.com/apps
            </a>
          </li>
          <li>Scroll to &quot;Your App Configuration Tokens&quot;</li>
          <li>Generate a token and copy the access token (starts with xoxe.xoxp-)</li>
        </ol>
        <Input
          id="slack-config-token"
          value={configToken}
          onChange={(event) => setConfigToken(event.target.value)}
          placeholder="xoxe.xoxp-…"
          className={cn('font-mono text-xs', tokenValid && 'border-success-base ring-success-base/40 ring-1')}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
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
        disabled={!tokenValid || submitMutation.isPending}
        onClick={() => {
          if (tokenValid) submitMutation.mutate({ configToken: trimmedToken });
        }}
      >
        Connect Slack
      </Button>
    </Card>
  );
}

function SuccessCard({ agentName }: { agentName: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-success-base/10 text-success-base flex size-12 items-center justify-center rounded-full">
          <RiCheckLine className="size-6" />
        </div>
        <h1 className="text-text-strong text-paragraph-md font-semibold">Slack app created</h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          Your Slack app is ready for <span className="text-text-strong font-medium">{agentName}</span>. Return to your
          terminal — the connect command will open Slack authorization next.
        </p>
      </div>
      <p className="text-text-soft text-label-xs mt-5 text-center">You can safely close this tab.</p>
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
          'Setup links are valid for 5 minutes. Re-run `npx novu connect` in your terminal to get a fresh link.',
      };
    case 'used':
      return {
        title: 'This setup link has already been used',
        description:
          'For security, each link works only once. Re-run `npx novu connect` if you need to configure Slack again.',
      };
    case 'invalid':
    default:
      return {
        title: 'This setup link is no longer valid',
        description: 'The link may be broken or for a different agent. Re-run `npx novu connect` to continue.',
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
