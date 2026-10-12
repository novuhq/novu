'use client';

import { ArrowUpRight } from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';

import { AppIcon } from '@/components/invite/app-icon';
import { Button, buttonClassName } from '@/components/ui/button';
import { MascotFace } from '@/components/ui/mascot-face';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import {
  type InactiveSetupReason,
  parseTelegramCredential,
  readSetupToken,
  rerunCommand,
  type SetupChannel,
} from '@/lib/setup-link';
import {
  getSetupLinkStatus,
  SetupLinkRequestError,
  type SlackSetupResult,
  submitSlackSetup,
  submitTelegramSetup,
  type TelegramSetupResult,
} from '@/lib/setup-link-api';
import { validateSlackConfigToken } from '@/lib/slack-app';
import { cn } from '@/lib/utils';

const BOTFATHER_URL = 'https://t.me/botfather';
const SLACK_APPS_URL = 'https://api.slack.com/apps';

type ConnectView =
  | { kind: 'loading' }
  | { kind: 'inactive'; reason: InactiveSetupReason }
  | { kind: 'form'; agentName?: string }
  | { kind: 'telegram-success'; result: TelegramSetupResult }
  | { kind: 'slack-success'; result: SlackSetupResult };

type ConnectPageProps = {
  apiUrl: string;
  channel: SetupChannel;
};

/**
 * Public page opened by `human setup` when the operator pastes credentials in the browser.
 * The token in the URL fragment is the only credential.
 */
export function ConnectPage({ apiUrl, channel }: ConnectPageProps) {
  const [view, setView] = useState<ConnectView>({ kind: 'loading' });

  useEffect(() => {
    const token = readSetupToken(window.location.hash);
    if (!token) {
      setView({ kind: 'inactive', reason: 'invalid' });

      return;
    }

    const controller = new AbortController();

    getSetupLinkStatus(apiUrl, channel, token, controller.signal)
      .then((status) => {
        if (controller.signal.aborted) {
          return;
        }

        if (!status.valid) {
          setView({ kind: 'inactive', reason: status.reason });

          return;
        }

        setView({ kind: 'form', agentName: status.agentName });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }

        setView({ kind: 'inactive', reason: 'invalid' });
      });

    return () => controller.abort();
  }, [apiUrl, channel]);

  return (
    <ConnectCard step={view.kind}>
      {view.kind === 'loading' && <CheckingLink />}
      {view.kind === 'inactive' && <InactiveLink channel={channel} reason={view.reason} />}
      {view.kind === 'form' && (
        <CredentialForm
          apiUrl={apiUrl}
          channel={channel}
          agentName={view.agentName}
          onInactive={(reason) => setView({ kind: 'inactive', reason })}
          onTelegramSuccess={(result) => setView({ kind: 'telegram-success', result })}
          onSlackSuccess={(result) => setView({ kind: 'slack-success', result })}
        />
      )}
      {view.kind === 'telegram-success' && <TelegramSuccess result={view.result} />}
      {view.kind === 'slack-success' && <SlackSuccess result={view.result} />}
    </ConnectCard>
  );
}

function CheckingLink() {
  return (
    <>
      <StepTitle>Checking your link</StepTitle>
      <output className="block font-mono text-[13px] leading-4.5 text-secondary">
        Loading
        <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
          ▍
        </span>
      </output>
    </>
  );
}

function InactiveLink({ channel, reason }: { channel: SetupChannel; reason: InactiveSetupReason }) {
  const copy = inactiveCopy(channel, reason);

  return (
    <>
      <img src="/illustrations/state-error.svg" alt="" width={120} height={120} className="size-30" />
      <StepTitle>{copy.title}</StepTitle>
      <CardText>{copy.text}</CardText>
      <p className="text-xs leading-4 text-muted">Setup links are single-use and time-limited on purpose.</p>
    </>
  );
}

function inactiveCopy(channel: SetupChannel, reason: InactiveSetupReason): { title: string; text: string } {
  const command = rerunCommand(channel);
  const connected = channel === 'telegram' ? 'your bot is connected' : 'Slack is connected';

  switch (reason) {
    case 'expired':
      return {
        title: 'This setup link has expired',
        text: `Setup links time out after a while. Back in your terminal, run ${command} again for a fresh link.`,
      };
    case 'used':
      return {
        title: 'This setup link was already used',
        text: `Each link works once. If ${connected}, check your terminal. Otherwise run ${command} again for a fresh link.`,
      };
    case 'invalid':
      return {
        title: 'This setup link is not valid',
        text: `The link may be incomplete or was made for a different environment. Run ${command} again for a fresh link.`,
      };
    default: {
      const exhaustive: never = reason;

      return exhaustive;
    }
  }
}

type CredentialFormProps = {
  apiUrl: string;
  channel: SetupChannel;
  agentName?: string;
  onInactive: (reason: InactiveSetupReason) => void;
  onTelegramSuccess: (result: TelegramSetupResult) => void;
  onSlackSuccess: (result: SlackSetupResult) => void;
};

function CredentialForm({
  apiUrl,
  channel,
  agentName,
  onInactive,
  onTelegramSuccess,
  onSlackSuccess,
}: CredentialFormProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const parsed = parseCredential(channel, draft);

  async function submit() {
    const token = readSetupToken(window.location.hash);
    const credential = parsed.credential;
    if (!token || !credential) {
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      if (channel === 'telegram') {
        onTelegramSuccess(await submitTelegramSetup(apiUrl, token, credential));

        return;
      }

      onSlackSuccess(await submitSlackSetup(apiUrl, token, credential));
    } catch (err) {
      const inactive = inactiveReasonOf(err);
      if (inactive) {
        onInactive(inactive);

        return;
      }

      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5.5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <ChannelIntro channel={channel} agentName={agentName} />
      <ol className="flex flex-col gap-5">
        <Instruction
          step="01"
          title={channel === 'telegram' ? 'Create the bot' : 'Generate an App Configuration Token'}
        >
          {channel === 'telegram' ? <TelegramInstructions /> : <SlackInstructions />}
        </Instruction>
        <Instruction step="02" title={channel === 'telegram' ? "Paste BotFather's reply" : 'Paste the token'}>
          <PasteField channel={channel} draft={draft} parsed={parsed} disabled={submitting} onDraft={setDraft} />
        </Instruction>
      </ol>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" pending={submitting} disabled={!parsed.credential} className="w-full">
        {channel === 'telegram' ? 'Connect bot' : 'Create the Slack app'}
      </Button>
    </form>
  );
}

function parseCredential(channel: SetupChannel, draft: string): { credential: string | null; status: string } {
  if (!draft.trim()) {
    return { credential: null, status: '' };
  }

  switch (channel) {
    case 'telegram':
      return parseTelegramCredential(draft);
    case 'slack': {
      const problem = validateSlackConfigToken(draft);

      return problem
        ? { credential: null, status: problem }
        : { credential: draft.trim(), status: 'App Configuration Token detected.' };
    }
    default: {
      const exhaustive: never = channel;

      return exhaustive;
    }
  }
}

function inactiveReasonOf(error: unknown): InactiveSetupReason | undefined {
  if (!(error instanceof SetupLinkRequestError)) {
    return undefined;
  }

  switch (error.code) {
    case 'token_already_used':
      return 'used';
    case 'token_expired':
      return 'expired';
    case 'token_invalid':
      return 'invalid';
    case 'unknown':
      return undefined;
    default: {
      const exhaustive: never = error.code;

      return exhaustive;
    }
  }
}

function ChannelIntro({ channel, agentName }: { channel: SetupChannel; agentName?: string }) {
  const who = agentName ?? 'Agents on your machine';

  if (channel === 'slack') {
    return (
      <>
        <AppIcon via="slack" size="large" />
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] leading-4 tracking-[0.08em] text-accent uppercase">Connect Slack</p>
          <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
            Your workspace, <Accent>one token</Accent>
          </h1>
          <CardText>
            {who} will reach you in Slack through an app created in your workspace. The token never goes through the
            terminal.
          </CardText>
        </div>
      </>
    );
  }

  return (
    <>
      <AppIcon via="telegram" size="large" />
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] leading-4 tracking-[0.08em] text-accent uppercase">Connect Telegram</p>
        <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
          Your <Accent>private line</Accent> to your agents
        </h1>
        <CardText>
          {who} will reach you through a Telegram bot that only you control. Two steps, on this phone or browser.
        </CardText>
      </div>
    </>
  );
}

function TelegramInstructions() {
  return (
    <>
      <CardText>
        Open <strong className="font-medium text-foreground">@BotFather</strong> in Telegram, send{' '}
        <code className="font-mono text-[12px] text-foreground">/newbot</code>, and pick a name. BotFather replies with
        a confirmation message that contains your token.
      </CardText>
      <a href={BOTFATHER_URL} target="_blank" rel="noreferrer" className={buttonClassName('secondary', 'self-start')}>
        Open BotFather
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </a>
    </>
  );
}

function SlackInstructions() {
  return (
    <>
      <CardText>
        Open Slack&apos;s app dashboard, scroll to{' '}
        <strong className="font-medium text-foreground">Your App Configuration Tokens</strong>, and generate one for the
        workspace.
      </CardText>
      <a href={SLACK_APPS_URL} target="_blank" rel="noreferrer" className={buttonClassName('secondary', 'self-start')}>
        Open api.slack.com/apps
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </a>
    </>
  );
}

function PasteField({
  channel,
  draft,
  parsed,
  disabled,
  onDraft,
}: {
  channel: SetupChannel;
  draft: string;
  parsed: { credential: string | null; status: string };
  disabled: boolean;
  onDraft: (value: string) => void;
}) {
  const id = useId();
  const detected = Boolean(parsed.credential);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] leading-4.5 text-secondary">
        {channel === 'telegram' ? (
          <>
            Paste the <strong className="font-medium text-foreground">entire message</strong>. The token is pulled out
            of it.
          </>
        ) : (
          <>
            It starts with <code className="font-mono text-[12px] text-foreground">xoxe.xoxp-</code>. It is used once to
            create the app, then thrown away.
          </>
        )}
      </label>
      <textarea
        id={id}
        value={draft}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={
          channel === 'telegram'
            ? 'Done! Congratulations on your new bot…\n\nUse this token to access the HTTP API:\n1234567890:AAFdT8_…'
            : 'xoxe.xoxp-…'
        }
        onChange={(event) => onDraft(event.target.value)}
        className={cn(
          'min-h-28 w-full resize-y rounded bg-background px-3 py-2.5 font-mono text-[13px] leading-5 text-foreground ring-1 ring-border-strong ring-inset placeholder:text-placeholder',
          'focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-accent/20 focus-visible:outline-none focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
          detected && 'ring-success focus-visible:ring-success'
        )}
      />
      <p
        aria-live="polite"
        className={cn('min-h-4 font-mono text-xs leading-4', detected ? 'text-success' : 'text-secondary')}
      >
        {parsed.status}
      </p>
    </div>
  );
}

function TelegramSuccess({ result }: { result: TelegramSetupResult }) {
  const name = result.botUsername ? `@${result.botUsername}` : 'Your bot';
  const deepLink = result.deepLinkUrl || (result.botUsername ? `https://t.me/${result.botUsername}` : '');

  return (
    <>
      <MascotFace art="waiting" mood="happy" className="size-35" />
      <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
        <span className="font-mono text-[22px]">{name}</span> is <Accent>wired up</Accent>
      </h1>
      <CardText>
        {deepLink ? (
          <>
            One last tap: open the bot in Telegram and press{' '}
            <strong className="font-medium text-foreground">Start</strong> so it knows it&apos;s you. Your terminal
            confirms as soon as it sees you.
          </>
        ) : (
          'The bot is saved. Open it in Telegram and press Start. Your terminal confirms as soon as it sees you.'
        )}
      </CardText>
      {deepLink && (
        <a href={deepLink} target="_blank" rel="noreferrer" className={buttonClassName('primary', 'w-full')}>
          Connect & test
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      )}
      <p className="text-xs leading-4 text-muted">After you tap Start you can close this tab.</p>
    </>
  );
}

function SlackSuccess({ result }: { result: SlackSetupResult }) {
  return (
    <>
      <MascotFace art="waiting" mood="happy" className="size-35" />
      <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
        Add it to <Accent>your workspace</Accent>
      </h1>
      <CardText>
        {result.authorizeUrl
          ? 'One last step: install the app so Slack knows it is you. Your terminal confirms as soon as it sees the install.'
          : 'The Slack app is created. Return to your terminal — it will finish the install from there.'}
      </CardText>
      {result.authorizeUrl && (
        <a href={result.authorizeUrl} target="_blank" rel="noreferrer" className={buttonClassName('primary', 'w-full')}>
          Add to Slack
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      )}
      <p className="text-xs leading-4 text-muted">
        {result.authorizeUrl
          ? 'The install link is valid for 5 minutes. After you approve it you can close this tab.'
          : 'You can close this tab.'}
      </p>
    </>
  );
}

function Instruction({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3">
      <span className="pt-0.5 font-mono text-[11px] leading-4 text-muted">{step}</span>
      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] leading-4.5 font-medium">{title}</h2>
        {children}
      </div>
    </li>
  );
}

function ConnectCard({ step, children }: { step: string; children: ReactNode }) {
  const { ref, height } = useMeasuredHeight();

  return (
    <div
      style={height === undefined ? undefined : { height: height + 2 }}
      className="relative isolate w-full max-w-120 overflow-hidden rounded-xl border border-border bg-background transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
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

function StepTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-base leading-6 font-medium">{children}</h1>;
}

function CardText({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-4.5 text-secondary">{children}</p>;
}

function Accent({ children }: { children: ReactNode }) {
  return <em className="font-display text-[26px] tracking-[-0.75px] text-accent">{children}</em>;
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
