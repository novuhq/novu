'use client';

import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useState } from 'react';

import { useConnectionPoll, WaitingLine } from '@/components/channels/setup-parts';
import { ConnectPromptBox, type SignedOutCode } from '@/components/connect/connect-prompt-box';
import { HostSetupBox } from '@/components/connect/host-setup-box';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyField } from '@/components/ui/copy-field';
import { MascotFace } from '@/components/ui/mascot-face';
import { Fold } from '@/components/ui/stepper';
import type { ConnectCodeState } from '@/hooks/use-connect-code';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import type { ConnectApi } from '@/lib/host-status';
import { type HostWay, waysOf } from '@/lib/host-ways';
import {
  type ChatApp,
  type CommandHost,
  exampleOf,
  type Host,
  type HostAlternative,
  type HostId,
  hostOf,
  isToolId,
  listenCommand,
  listenLead,
} from '@/lib/hosts';
import { openDesktopApp } from '@/lib/open-desktop-app';
import { cn } from '@/lib/utils';

/** How long the steps take to fade out before "connected" rises in. */
const SWAP_MS = 200;

/** How long the line under the steps takes to fade out before the next one fades in. */
const LINE_SWAP_MS = 150;

/** How long the steps take to ease to the height of what replaces them. */
const HEIGHT_MS = 300;

/** Room around the steps for a focus ring (`outline-offset-4` and 2px of outline), so clipping them spares it. */
const FOCUS_ROOM_PX = 6;

/**
 * The same room around a line under the box, which its fold clips while it opens and closes: the glow around the
 * waiting dot reaches past the line's edge, and so does a focus ring around its copy button.
 */
const FOLD_ROOM = '-mx-1.5 px-1.5 -mb-1.5 pb-1.5';

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
  /** Whether the second way in starts unfolded. */
  alternativeOpen?: boolean;
  /** Whether the optional last step shows for a host `listen` can start: listening for messages. */
  showListen?: boolean;
};

/**
 * A host that runs commands on its public page: its commands with the code in them, then its second way in, if
 * it has one. The dashboard has a tab for each instead (`HostPanel`).
 */
export function CommandSteps({
  host,
  handle,
  apiUrl,
  code,
  onRetry,
  mcpUrl,
  hideLead = false,
  alternativeOpen = true,
  showListen = true,
}: CommandStepsProps) {
  const alternative = host.alternative;
  const listen = showListen ? listenCommand(host) : undefined;
  const showsAlternative = alternative && (alternative.kind === 'plugin' || mcpUrl !== null);

  return (
    <>
      {!hideLead && <p className="text-[13px] leading-[19px] text-secondary">{commandsLead(host)}</p>}
      <ConnectPromptBox handle={handle} apiUrl={apiUrl} code={code} onRetry={onRetry} host={host} />
      {host.afterCommands && <p className="text-xs leading-4 text-secondary">{host.afterCommands}</p>}
      {listen && <ListenStep host={host} handle={handle} command={listen} />}
      {showsAlternative && (
        <AlternativeSteps alternative={alternative} mcpUrl={mcpUrl ?? ''} defaultOpen={alternativeOpen} />
      )}
    </>
  );
}

/**
 * The optional last step for a host `listen` can start (Claude Code for now): listening for messages, so a message
 * to the agent starts it on that computer. Not in the design yet: built from this panel's own parts, the small
 * line of the second way in and its copy field.
 */
function ListenStep({ host, handle, command }: { host: CommandHost; handle: string; command: string }) {
  return (
    <section aria-label={`Let a message start ${host.name}`} className="flex flex-col gap-2">
      <p className="text-xs leading-4 text-secondary">
        <span className="font-medium text-foreground">Optional: listen for messages.</span>{' '}
        {listenLead(host, handle || undefined)}
      </p>
      <CopyField value={command} label={`Copy the command that listens for messages for ${host.name}`} command />
    </section>
  );
}

type AlternativeStepsProps = {
  alternative: HostAlternative;
  mcpUrl: string;
  defaultOpen: boolean;
};

/**
 * The second way in, under a divider like the onboarding's "or from your terminal" (`0.3 · Connect`): the
 * plugin's commands, or the MCP server's config with the host's own sign-in. The divider's words fold it
 * open and shut.
 */
function AlternativeSteps({ alternative, mcpUrl, defaultOpen }: AlternativeStepsProps) {
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
        </div>
      </Fold>
    </section>
  );
}

function AlternativeContent({ alternative, mcpUrl }: { alternative: HostAlternative; mcpUrl: string }) {
  return (
    <>
      {alternative.kind === 'plugin' ? (
        <>
          <p className="text-xs leading-4 text-secondary">{alternative.text}</p>
          <CodeBlock
            code={alternative.lines.join('\n')}
            label={`Copy the ${alternative.typedIn === 'host' ? 'plugin commands' : 'commands'}`}
            className="rounded-md"
          />
        </>
      ) : (
        <>
          {/* The command that adds the server comes first, where a host has one: the config is for editing the file. */}
          {alternative.addCommand && (
            <>
              <p className="text-xs leading-4 text-secondary">{alternative.addCommand.text}</p>
              <CopyField
                value={alternative.addCommand.line(mcpUrl)}
                label="Copy the command that adds the server"
                command
              />
            </>
          )}
          <p className="text-xs leading-4 text-secondary">{alternative.text}</p>
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
      {alternative.afterSignIn && <p className="text-xs leading-4 text-secondary">{alternative.afterSignIn}</p>}
    </>
  );
}

/** "Or install the Claude Code plugin" as the divider has it, in lower case as `0.3 · Connect` writes its own, names aside. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
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
};

/**
 * What a chat app's operator does in the app (`4c.1 · ChatGPT`), on its public page: numbered steps, all shown
 * at once since they happen in the app, the MCP server's address to paste, and a button that opens the app's
 * settings.
 */
export function ChatAppSteps({ host, mcpUrl, handle, hideLead = false }: ChatAppStepsProps) {
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
      {host.settings && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <AppLink href={host.settings.url} desktopUrl={host.settings.desktopUrl}>
            {host.settings.label}
          </AppLink>
        </div>
      )}
    </>
  );
}

/**
 * A button to a chat app's page that opens its desktop app instead when that's installed (`openDesktopApp`).
 * A click with a modifier key, or a page without scripts, still opens the page in a new tab.
 */
function AppLink({ href, desktopUrl, children }: { href: string; desktopUrl?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={buttonClassName('primary')}
      onClick={(event) => {
        const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
        if (desktopUrl && plainClick) {
          event.preventDefault();
          openDesktopApp(desktopUrl, href);
        }
      }}
    >
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
      {children}
      <span className="sr-only">
        {desktopUrl ? ' (opens the desktop app, or a new tab without it)' : ' (opens in a new tab)'}
      </span>
    </a>
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

type HostSignedInProps = {
  host: Host;
  handle: string;
  /** Brings back a coding agent's steps, which it still has use for: listening, another computer, its other way in. */
  onShowSteps: () => void;
};

/**
 * What replaces a host's steps once it's connected (`4c.2`): a chat app's with the app to open, a coding agent's
 * with the way back to its steps.
 */
function HostSignedIn({ host, handle, onShowSteps }: HostSignedInProps) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-10 text-center">
      <MascotFace art="waiting" mood="happy" className="size-40" />
      <h3 className="text-base leading-6 font-medium text-foreground">
        {host.name} is now {handle}
      </h3>
      <p className="text-[13px] leading-4.5 text-secondary">
        Try asking {host.name}: “{exampleOf(host)}”
      </p>
      {host.group === 'chat' && host.appUrl && (
        <AppLink href={host.appUrl} desktopUrl={host.desktopUrl}>
          Open {host.name}
        </AppLink>
      )}
      {host.group === 'commands' && (
        <Button variant="quiet" className={SMALL_BUTTON} onClick={onShowSteps}>
          Show the steps
        </Button>
      )}
    </div>
  );
}

type HostPanelProps = {
  /** The host chosen in the picker. */
  selected: HostId;
  handle: string;
  /** The agent's address, which a chat app's prompt names. */
  address?: string | null;
  apiUrl: string;
  code: ConnectCodeState;
  onRetry: () => void;
  mcpUrl: string | null;
  docsUrl: string;
  /** The hosts that connected already (`HostPicker`). */
  connected: ReadonlySet<HostId>;
  api: Pick<ConnectApi, 'isToolSignedIn'>;
  /** Told when a chat app, or a coding agent through its plugin or MCP config, signed in while its steps were on show. */
  onSignedIn?: (host: HostId) => void;
  /**
   * Whether the line under the box says what it waits for ("Waiting for ChatGPT to connect…"). The onboarding
   * says it on the agent's card next to it instead.
   */
  showWaiting?: boolean;
  /** Whether the optional "listen for messages" step shows under the commands of a host `listen` can start. */
  showListen?: boolean;
  /** Whether a connected host's box gives way to "<host> is now <agent>". The onboarding moves on instead. */
  showSignedIn?: boolean;
};

/**
 * The steps of the host chosen in the picker, in the dashboard: the box with a tab for each of its ways in
 * (`HostSetupBox`), each host on the tab it was last on. The code is the one the page holds for the host on
 * show (`useHostConnectCode`).
 *
 * A chat app, and a coding agent while its Plugin or MCP tab is open, is asked all the while whether it has
 * signed in, as the MCP server records for each app it tells apart (`isToolId`). A connected host's box gives way
 * to "<host> is now <agent>" (`4c.2`): a chat app's for good, a coding agent's until the operator asks for its
 * steps again ("Show the steps"), whose line under the box then says it's connected.
 */
export function HostPanel({
  selected,
  handle,
  address,
  apiUrl,
  code,
  onRetry,
  mcpUrl,
  docsUrl,
  connected,
  api,
  onSignedIn,
  showWaiting = true,
  showListen = true,
  showSignedIn = true,
}: HostPanelProps) {
  const router = useRouter();
  const host = hostOf(selected);
  const [chosenWays, setChosenWays] = useState<Partial<Record<HostId, HostWay>>>({});
  // Known before the page has been reloaded with it, and kept after the page stops saying so.
  const [signedIn, setSignedIn] = useState<ReadonlySet<HostId>>(() => new Set());
  const isSignedIn = (id: HostId) => signedIn.has(id) || connected.has(id);
  // The connected coding agents whose steps the operator asked to see again.
  const [stepsShown, setStepsShown] = useState<ReadonlySet<HostId>>(() => new Set());

  const waysFor = (forHost: Host) => waysOf(forHost).filter((way) => way !== 'mcp' || mcpUrl !== null);
  const wayFor = (forHost: Host) => {
    const ways = waysFor(forHost);
    const chosen = chosenWays[forHost.id];

    return chosen && ways.includes(chosen) ? chosen : ways[0];
  };
  const way = wayFor(host);

  const watched = watchesSignIn(host, way, mcpUrl);
  useConnectionPoll<HostId>({
    waiting: watched && !isSignedIn(host.id),
    // It asks for as long as the steps are on show: installing a plugin, signing in and then the host's first
    // connection (Codex's comes when a session starts) can take far longer than a drawer usually waits.
    giveUpAfterMs: null,
    // Only this app's own sign-in counts: the MCP server is shared by every app, so a check through it could
    // be another app's. The answer names the host it was asked for, in case the picker moved on meanwhile.
    check: async () => {
      // A tab out of sight asks nothing; it picks up again as soon as the operator comes back to it.
      if (document.visibilityState === 'hidden') {
        return null;
      }

      const id = host.id;

      return isToolId(id) && (await api.isToolSignedIn(id).catch(() => false)) ? id : null;
    },
    onConnected: (id) => {
      setSignedIn((hosts) => new Set(hosts).add(id));
      onSignedIn?.(id);
      router.refresh();
    },
  });

  // A connected host says so instead of its steps: a chat app for good, a coding agent until they're asked for.
  const view = showSignedIn && isSignedIn(host.id) && !stepsShown.has(host.id) ? `signed-in:${host.id}` : 'steps';
  const { shown, leaving } = useSwap(view, SWAP_MS);
  const { ref, height } = useMeasuredHeight();
  const easing = useSwapEasing(leaving);

  if (host.group === 'chat' && mcpUrl === null) {
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

  const signedInHost = shown.startsWith('signed-in:') ? hostOf(shown.slice('signed-in:'.length) as HostId) : null;

  return (
    // While one view gives way to the next, clipped, so taller steps show only as far as the block has grown
    // and never cover what's below it. The block reaches 6px past the steps on every side, where a focus ring
    // around a button at their edge goes.
    <div
      style={easing && height !== undefined ? { height: height + 2 * FOCUS_ROOM_PX } : undefined}
      className={cn(
        '-m-1.5 p-1.5',
        easing && 'overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none'
      )}
    >
      <p aria-live="polite" className="sr-only">
        {view === 'steps' ? '' : `${host.name} is now ${handle}`}
      </p>
      <div ref={ref}>
        <div
          key={shown}
          className={cn(
            'flex flex-col',
            leaving
              ? 'opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none'
              : shown !== 'steps' && 'animate-rise-in motion-reduce:animate-none'
          )}
        >
          {signedInHost ? (
            <HostSignedIn
              host={signedInHost}
              handle={handle}
              onShowSteps={() => setStepsShown((hosts) => new Set(hosts).add(signedInHost.id))}
            />
          ) : (
            <>
              <HostSetupBox
                host={host}
                waysFor={waysFor}
                wayFor={wayFor}
                onWayChange={(next) => setChosenWays((ways) => ({ ...ways, [host.id]: next }))}
                handle={handle}
                address={address}
                apiUrl={apiUrl}
                code={code}
                onRetry={onRetry}
                mcpUrl={mcpUrl ?? ''}
              />
              <ListenFold host={showListen ? listeningHost(host, way) : null} handle={handle} />
              <WatchLine line={showWaiting && watched ? { host, signedIn: isSignedIn(host.id), handle } : null} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Whether the block holds its height and eases it, which it does only while one view gives way to the next
 * and until it has eased to the next one's height. The rest of the time it is as tall as what's in it, so
 * the box's own easing, as its host or tab changes, shows whole instead of being chased and clipped.
 */
function useSwapEasing(leaving: boolean): boolean {
  const [easing, setEasing] = useState(false);
  if (leaving && !easing) {
    setEasing(true);
  }

  useEffect(() => {
    if (!easing || leaving) {
      return;
    }

    const timer = window.setTimeout(() => setEasing(false), HEIGHT_MS + 50);

    return () => window.clearTimeout(timer);
  }, [easing, leaving]);

  return easing;
}

/**
 * Whether the page asks if the host has signed in: only the hosts the MCP server tells apart can be told so,
 * and only on a tab whose way in signs in through it. Every way but the CLI does: a chat app's, a plugin, which
 * brings the MCP server along, and an MCP config.
 */
function watchesSignIn(host: Host, way: HostWay, mcpUrl: string | null): boolean {
  return isToolId(host.id) && mcpUrl !== null && way !== 'cli';
}

/** The host whose commands get the listen step under them now: one `listen` can start, on its CLI tab. */
function listeningHost(host: Host, way: HostWay): CommandHost | null {
  return host.group === 'commands' && way === 'cli' && listenCommand(host) ? host : null;
}

/**
 * Under the commands of a host `listen` can start (`ListenStep`): it unfolds while their CLI tab is on show,
 * and folds away for another tab or host, keeping its words while it closes.
 */
function ListenFold({ host, handle }: { host: CommandHost | null; handle: string }) {
  const [last, setLast] = useState(host);
  if (host && host !== last) {
    setLast(host);
  }

  const command = last ? listenCommand(last) : undefined;

  return (
    <Fold open={host !== null} innerClassName={FOLD_ROOM}>
      <div className="pt-4.5">{last && command && <ListenStep host={last} handle={handle} command={command} />}</div>
    </Fold>
  );
}

type Watch = { host: Host; signedIn: boolean; handle: string };

/**
 * Under the box: "Waiting for ChatGPT to connect…" while the page asks, and "Cursor is now <agent>" once it
 * has signed in. The line unfolds when a host that can be asked is chosen, and folds away for one that can't;
 * a new host's line fades in where the last one was.
 */
function WatchLine({ line }: { line: Watch | null }) {
  // The last line stays on show while the fold closes over it.
  const [last, setLast] = useState(line);
  if (line && (line.host !== last?.host || line.signedIn !== last.signedIn || line.handle !== last.handle)) {
    setLast(line);
  }

  const key = last ? `${last.host.id}:${last.signedIn}` : 'none';
  const { shown, leaving } = useSwap(key, LINE_SWAP_MS);
  // What the line on show says, which keeps its own words while it fades out for the next host's.
  const [shownId, shownState] = shown.split(':');
  const shownLine =
    last && shown !== 'none' ? { host: hostOf(shownId as HostId), signedIn: shownState === 'true' } : null;

  return (
    <Fold open={line !== null} innerClassName={FOLD_ROOM}>
      <div className="pt-4.5">
        <div
          key={shown}
          className={cn(
            leaving
              ? 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
              : 'animate-overlay-in motion-reduce:animate-none'
          )}
        >
          {last &&
            shownLine &&
            (shownLine.signedIn ? (
              <p className="flex items-center gap-2.5 text-xs leading-4 text-secondary">
                <Check aria-hidden="true" className="size-3 shrink-0 text-success" strokeWidth={2.5} />
                {shownLine.host.name} is now {last.handle}
              </p>
            ) : (
              <WaitingLine className="pl-0">Waiting for {shownLine.host.name} to connect…</WaitingLine>
            ))}
        </div>
      </div>
    </Fold>
  );
}
