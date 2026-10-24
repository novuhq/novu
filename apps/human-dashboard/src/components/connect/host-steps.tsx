'use client';

import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useId, useState } from 'react';

import { useConnectionPoll, WaitingLine } from '@/components/channels/setup-parts';
import { ConnectPromptBox, type SignedOutCode } from '@/components/connect/connect-prompt-box';
import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyField } from '@/components/ui/copy-field';
import { MascotFace } from '@/components/ui/mascot-face';
import { Fold } from '@/components/ui/stepper';
import type { ConnectCodeState } from '@/hooks/use-connect-code';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import type { ConnectApi } from '@/lib/host-status';
import {
  type ChatApp,
  type CommandHost,
  type Host,
  type HostAlternative,
  type HostId,
  hostOf,
  isToolId,
} from '@/lib/hosts';
import { cn } from '@/lib/utils';

/** How long the steps take to fade out before "connected" rises in. */
const SWAP_MS = 200;

/** How long one host's steps take to fade out before the next host's fade in. */
const HOST_SWAP_MS = 150;

/** Room around the steps for a focus ring (`outline-offset-4` and 2px of outline), so clipping them spares it. */
const FOCUS_ROOM_PX = 6;

/** The line above a chat app's steps. */
export function chatAppLead(host: ChatApp, handle?: string): string {
  return `Connect ${host.name} to ${handle ? `${handle}’s` : 'your agent’s'} inbox.`;
}

/** The line above a host's commands: where to run them. */
export function commandsLead(host: CommandHost): string {
  return host.runsIn === 'computer'
    ? 'Run these in a terminal, on the computer your agent runs on.'
    : 'Run these in your terminal, in the project your agent works in.';
}

type CommandStepsProps = {
  host: CommandHost;
  /** The agent, as `connect` names it. */
  handle: string;
  /** The API the account lives on. Left out on a public page. */
  apiUrl?: string;
  /** The one-time code, or `signed-out` on a public page. */
  code: ConnectCodeState | SignedOutCode;
  onRetry?: () => void;
  /** The hosted MCP server, for the second way in that adds it; `null` hides that way. */
  mcpUrl: string | null;
  /** Leaves out the line above the commands, for a page that says it in its own words. */
  hideLead?: boolean;
  /** Whether the second way in starts unfolded. The onboarding keeps it folded, to stay short. */
  alternativeOpen?: boolean;
  /** The dashboard watches for the host's sign-in after its MCP config; a public page has nothing to watch. */
  signIn?: SignInWatch;
};

/** Watching in the dashboard for a host's own sign-in to the MCP server, as `ChatAppSignIn` does for a chat app. */
type SignInWatch = {
  /** Whether the page knows the host has signed in to the account. Once true, it stays so. */
  connected: boolean;
  api: Pick<ConnectApi, 'isToolSignedIn'>;
  /** Told once it signed in while its steps were on show. */
  onSignedIn?: () => void;
};

/** A host that runs commands: its commands with the code in them, then its second way in, if it has one. */
export function CommandSteps({
  host,
  handle,
  apiUrl,
  code,
  onRetry,
  mcpUrl,
  hideLead = false,
  alternativeOpen = true,
  signIn,
}: CommandStepsProps) {
  const alternative = host.alternative;
  const showsAlternative = alternative && (alternative.kind === 'plugin' || mcpUrl !== null);
  // Only the hosts the MCP server tells apart (`isToolId`) can be told signed in: Cursor, after its MCP config.
  const watch = signIn && alternative?.kind === 'mcp-config' && isToolId(host.id) ? signIn : null;

  return (
    <>
      {!hideLead && <p className="text-[13px] leading-[19px] text-secondary">{commandsLead(host)}</p>}
      <ConnectPromptBox handle={handle} apiUrl={apiUrl} code={code} onRetry={onRetry} host={host} />
      {host.afterCommands && <p className="text-xs leading-4 text-secondary">{host.afterCommands}</p>}
      {showsAlternative && (
        <AlternativeSteps alternative={alternative} mcpUrl={mcpUrl ?? ''} defaultOpen={alternativeOpen}>
          {watch && <HostSignInLine host={host} handle={handle} {...watch} />}
        </AlternativeSteps>
      )}
    </>
  );
}

type AlternativeStepsProps = {
  alternative: HostAlternative;
  mcpUrl: string;
  defaultOpen: boolean;
  /** Under the steps: whether the host has signed in yet (`HostSignInLine`). */
  children?: ReactNode;
};

/**
 * The second way in, under a divider like the onboarding's "or from your terminal" (`0.3 · Connect`): the
 * plugin's commands, or the MCP server's config with the host's own sign-in. The divider's words fold it
 * open and shut.
 */
function AlternativeSteps({ alternative, mcpUrl, defaultOpen, children }: AlternativeStepsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section aria-label={alternative.title} className="flex flex-col">
      <Divider>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex cursor-pointer items-center gap-1.5 rounded-sm transition-colors duration-150 hover:text-secondary focus-visible:outline-offset-2 motion-reduce:transition-none"
        >
          {lowerFirst(alternative.title)}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3 transition-transform duration-300 ease-out motion-reduce:transition-none',
              open && 'rotate-180'
            )}
          />
        </button>
      </Divider>
      <Fold open={open}>
        <div id={contentId} className="flex flex-col gap-2.5 pt-2.5">
          <AlternativeContent alternative={alternative} mcpUrl={mcpUrl} />
          {children}
        </div>
      </Fold>
    </section>
  );
}

function AlternativeContent({ alternative, mcpUrl }: { alternative: HostAlternative; mcpUrl: string }) {
  return (
    <>
      <p className="text-xs leading-4 text-secondary">{alternative.text}</p>
      {alternative.kind === 'plugin' ? (
        <CodeBlock
          code={alternative.lines.join('\n')}
          label={`Copy the ${alternative.typedIn === 'host' ? 'plugin commands' : 'commands'}`}
          className="rounded-md"
        />
      ) : (
        <>
          {alternative.installLink && (
            <a
              href={alternative.installLink.href(mcpUrl)}
              className={buttonClassName('secondary', cn(SMALL_BUTTON, 'self-start'))}
            >
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              {alternative.installLink.label}
            </a>
          )}
          <CodeBlock
            code={alternative.config(mcpUrl)}
            label={`Copy the ${alternative.file} config`}
            className="rounded-md"
          />
        </>
      )}
      <p className="text-xs leading-4 text-secondary">{alternative.signIn}</p>
      {alternative.signInCommand && (
        <CopyField value={alternative.signInCommand} label="Copy the sign-in command" command />
      )}
    </>
  );
}

/** "Or install the Claude Code plugin" as the divider has it, in lower case as `0.3 · Connect` writes its own, names aside. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** The line above a host's steps, whichever kind it is. */
export function hostLead(host: Host, handle?: string): string {
  return host.group === 'commands' ? commandsLead(host) : chatAppLead(host, handle);
}

/** A hairline across with a few words in the middle. */
export function Divider({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] leading-4 text-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </p>
  );
}

type ChatAppStepsProps = {
  host: ChatApp;
  /** The hosted MCP server the app adds. */
  mcpUrl: string;
  /** How the agent is called in a sentence, or left out on a public page. */
  handle?: string;
  /** Leaves out the line above the steps, for a page that says it in its own words. */
  hideLead?: boolean;
  /** Under the steps: the waiting line in the dashboard. */
  children?: ReactNode;
};

/**
 * What a chat app's operator does in the app (`4c.1 · ChatGPT`): numbered steps, all shown at once since
 * they happen in the app, the MCP server's address to paste, and a button that opens the app's settings.
 */
export function ChatAppSteps({ host, mcpUrl, handle, hideLead = false, children }: ChatAppStepsProps) {
  return (
    <>
      {!hideLead && <p className="text-[13px] leading-4.5 text-secondary">{chatAppLead(host, handle)}</p>}
      <ol className="flex flex-col gap-4.5">
        {host.steps.map((step, index) => (
          <Step
            key={step.title}
            index={index + 1}
            title={step.title}
            extra={
              step.copy && (
                <CopyField
                  value={step.copy.value(mcpUrl)}
                  // The design writes the address in the brighter text color.
                  display={<span className="text-foreground">{step.copy.value(mcpUrl)}</span>}
                  label={step.copy.label}
                  action="Copy"
                />
              )
            }
          >
            {step.text}
          </Step>
        ))}
      </ol>
      {(host.settings || children) && (
        // The button that opens the app, and what this page waits for, side by side where they fit.
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {host.settings && (
            <a href={host.settings.url} target="_blank" rel="noreferrer" className={buttonClassName('primary')}>
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              {host.settings.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {children}
        </div>
      )}
    </>
  );
}

type StepProps = {
  index: number;
  title: string;
  /** A field under the step's words. */
  extra?: ReactNode;
  children: ReactNode;
};

/** One numbered step. All of an app's steps show at once: they happen in the app, not on this page. */
function Step({ index, title, extra, children }: StepProps) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-5.5 shrink-0 place-items-center rounded-full bg-raised font-mono text-[11px] leading-4 text-foreground ring-1 ring-border ring-inset"
      >
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-[13px] leading-4.5 font-medium text-foreground">{title}</h3>
        <p className="text-xs leading-4 text-secondary">{children}</p>
        {extra}
      </div>
    </li>
  );
}

type ChatAppSignInProps = {
  host: ChatApp;
  /** The hosted MCP server, or `null` while there is none: the app then can't connect, and the docs say why. */
  mcpUrl: string | null;
  docsUrl: string;
  handle: string;
  /** Whether the page knows the app has signed in to the account. Once true, it stays so. */
  connected: boolean;
  api: Pick<ConnectApi, 'isToolSignedIn'>;
  /** Told once the app signed in while its steps were on show. */
  onSignedIn?: () => void;
  /** Leaves out the line above the steps (`ChatAppSteps`). */
  hideLead?: boolean;
};

/**
 * A chat app in the dashboard's picker: its steps and "Waiting for ChatGPT to connect…", asking all the
 * while whether this app has signed in, as the MCP server records for each app. The steps then give way to
 * "<app> is now <agent>" (`4c.2`). Only the apps the MCP server tells apart (`isToolId`) can be told so far.
 */
export function ChatAppSignIn({
  host,
  mcpUrl,
  docsUrl,
  handle,
  connected,
  api,
  onSignedIn,
  hideLead,
}: ChatAppSignInProps) {
  const router = useRouter();
  // Known before the page has been reloaded with it, and kept after the page stops saying so.
  const [signedIn, setSignedIn] = useState(connected);
  if (connected && !signedIn) {
    setSignedIn(true);
  }

  const tool = isToolId(host.id) ? host.id : null;
  useConnectionPoll({
    waiting: mcpUrl !== null && tool !== null && !signedIn,
    // Only this app's own sign-in counts: the MCP server is shared by every chat app, so a check through it
    // could be another app's.
    check: async () => (tool !== null && (await api.isToolSignedIn(tool).catch(() => false))) || null,
    onConnected: () => {
      setSignedIn(true);
      onSignedIn?.();
      router.refresh();
    },
  });

  const { shown, leaving } = useSwap(signedIn ? 'connected' : 'steps', SWAP_MS);
  const { ref, height } = useMeasuredHeight();

  if (mcpUrl === null) {
    return (
      <p className="text-[13px] leading-4.5 text-secondary">
        {host.name} connects through the Agent Inbox MCP server, which isn’t set up here yet.{' '}
        <a href={docsUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
          Read the docs
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    );
  }

  return (
    // The steps and "connected" differ in height; the block follows while one fades into the other.
    <div
      style={{ height }}
      className="transition-[height] duration-300 ease-out motion-reduce:transition-none"
      aria-live="polite"
    >
      <div ref={ref}>
        <div
          key={shown}
          className={cn(
            'flex flex-col gap-5.5',
            leaving
              ? 'opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none'
              : 'animate-rise-in motion-reduce:animate-none'
          )}
        >
          {shown === 'connected' ? (
            <HostSignedIn host={host} handle={handle} />
          ) : (
            <ChatAppSteps host={host} mcpUrl={mcpUrl} handle={handle} hideLead={hideLead}>
              {tool !== null && <WaitingLine className="pl-0">Waiting for {host.name} to connect…</WaitingLine>}
            </ChatAppSteps>
          )}
        </div>
      </div>
    </div>
  );
}

/** What replaces a chat app's steps once it has signed in (`4c.2`). */
function HostSignedIn({ host, handle }: { host: ChatApp; handle: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-10 text-center">
      <MascotFace art="waiting" mood="happy" className="size-40" />
      <h3 className="text-base leading-6 font-medium text-foreground">
        {host.name} is now {handle}
      </h3>
      <p className="text-[13px] leading-4.5 text-secondary">
        Try asking {host.name}: “{host.example}”
      </p>
      {host.appUrl && (
        <a href={host.appUrl} target="_blank" rel="noreferrer" className={buttonClassName('primary')}>
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Open {host.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

type HostSignInLineProps = SignInWatch & { host: CommandHost; handle: string };

/**
 * After a host's MCP config (Cursor's): "Waiting for Cursor to connect…", asking all the while whether it has
 * signed in to the account, as the MCP server records for each app it tells apart, then "Cursor is now
 * <agent>", as a chat app says it (`ChatAppSignIn`). The commands above stay, for the CLI.
 */
function HostSignInLine({ host, handle, connected, api, onSignedIn }: HostSignInLineProps) {
  const router = useRouter();
  // Known before the page has been reloaded with it, and kept after the page stops saying so.
  const [signedIn, setSignedIn] = useState(connected);
  if (connected && !signedIn) {
    setSignedIn(true);
  }

  const tool = isToolId(host.id) ? host.id : null;
  useConnectionPoll({
    waiting: tool !== null && !signedIn,
    check: async () => (tool !== null && (await api.isToolSignedIn(tool).catch(() => false))) || null,
    onConnected: () => {
      setSignedIn(true);
      onSignedIn?.();
      router.refresh();
    },
  });
  const { shown, leaving } = useSwap(signedIn ? 'connected' : 'waiting', SWAP_MS);

  return (
    <div aria-live="polite">
      <div
        key={shown}
        className={cn(
          leaving
            ? 'opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none'
            : 'animate-overlay-in motion-reduce:animate-none'
        )}
      >
        {shown === 'connected' ? (
          <p className="flex items-center gap-2.5 text-xs leading-4 text-secondary">
            <Check aria-hidden="true" className="size-3 shrink-0 text-success" strokeWidth={2.5} />
            {host.name} is now {handle}
          </p>
        ) : (
          <WaitingLine className="pl-0">Waiting for {host.name} to connect…</WaitingLine>
        )}
      </div>
    </div>
  );
}

type HostPanelProps = {
  /** The host chosen in the picker. */
  selected: HostId;
  handle: string;
  apiUrl: string;
  code: ConnectCodeState;
  onRetry: () => void;
  mcpUrl: string | null;
  docsUrl: string;
  /** The hosts that connected already (`HostPicker`). */
  connected: ReadonlySet<HostId>;
  api: Pick<ConnectApi, 'isToolSignedIn'>;
  /** Told when a chat app, or Cursor after its MCP config, signed in while its steps were on show. */
  onSignedIn?: (host: HostId) => void;
  /** Whether a host's second way in starts unfolded (`CommandSteps`). */
  alternativeOpen?: boolean;
  /** Leaves out the line above the steps, for a page that says it in its own words (`hostLead`). */
  hideLead?: boolean;
};

/**
 * The steps of the host chosen in the picker, in the dashboard: its commands with the one-time code, or a
 * chat app's sign-in. Choosing another host fades these out and the next ones in, while the height follows.
 * The code is the page's, so it stays the same from one host to the next.
 */
export function HostPanel({
  selected,
  handle,
  apiUrl,
  code,
  onRetry,
  mcpUrl,
  docsUrl,
  connected,
  api,
  onSignedIn,
  alternativeOpen,
  hideLead,
}: HostPanelProps) {
  const { shown, leaving } = useSwap(selected, HOST_SWAP_MS);
  const { ref, height } = useMeasuredHeight();
  const host = hostOf(shown);

  return (
    // Clipped, so taller steps show only as far as the block has grown and never cover what's below it. The
    // block reaches 6px past the steps on every side, where a focus ring around a button at their edge goes.
    <div
      style={height === undefined ? undefined : { height: height + 2 * FOCUS_ROOM_PX }}
      className="-m-1.5 overflow-hidden p-1.5 transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={ref}>
        <div
          key={shown}
          className={cn(
            'flex flex-col gap-4.5',
            leaving
              ? 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
              : 'animate-overlay-in [animation-duration:200ms] motion-reduce:animate-none'
          )}
        >
          {host.group === 'commands' ? (
            <CommandSteps
              host={host}
              handle={handle}
              apiUrl={apiUrl}
              code={code}
              onRetry={onRetry}
              mcpUrl={mcpUrl}
              alternativeOpen={alternativeOpen}
              hideLead={hideLead}
              signIn={{ connected: connected.has(host.id), api, onSignedIn: () => onSignedIn?.(host.id) }}
            />
          ) : (
            <ChatAppSignIn
              host={host}
              mcpUrl={mcpUrl}
              docsUrl={docsUrl}
              handle={handle}
              connected={connected.has(host.id)}
              api={api}
              onSignedIn={() => onSignedIn?.(host.id)}
              hideLead={hideLead}
            />
          )}
        </div>
      </div>
    </div>
  );
}
