'use client';

import { ArrowUpRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useConnectionPoll, WaitingLine } from '@/components/channels/setup-parts';
import { HostSetupBox } from '@/components/connect/host-setup-box';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyField } from '@/components/ui/copy-field';
import { MascotFace } from '@/components/ui/mascot-face';
import { Fold } from '@/components/ui/stepper';
import type { ConnectCodeState } from '@/hooks/use-connect-code';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import type { ConnectApi } from '@/lib/host-status';
import { type HostWay, waysOf } from '@/lib/host-ways';
import {
  type CommandHost,
  exampleOf,
  type Host,
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

/**
 * The optional last step for a host `listen` can start (Claude Code for now): listening for messages, so a message
 * to the agent starts it on that computer. The dashboard folds it under the CLI tab; a public page does the same.
 */
export function ListenStep({ host, handle, command }: { host: CommandHost; handle: string; command: string }) {
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

/**
 * A button to a chat app's page that opens its desktop app instead when that's installed (`openDesktopApp`).
 * A click with a modifier key, or a page without scripts, still opens the page in a new tab.
 */
export function AppLink({ href, desktopUrl, children }: { href: string; desktopUrl?: string; children: ReactNode }) {
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
  // The host on show when an answer comes back, which may no longer be the one it was asked for.
  const hostOnShow = useRef(host.id);
  useEffect(() => {
    hostOnShow.current = host.id;
  });
  useConnectionPoll<HostId>({
    waiting: watched && !isSignedIn(host.id),
    // It asks for as long as the steps are on show: installing a plugin, signing in and then the host's first
    // connection (Codex's comes when a session starts) can take far longer than a drawer usually waits.
    giveUpAfterMs: null,
    // Only this app's own sign-in counts: the MCP server is shared by every app, so a check through it could
    // be another app's.
    check: async () => {
      // A tab out of sight asks nothing; it picks up again as soon as the operator comes back to it.
      if (document.visibilityState === 'hidden') {
        return null;
      }

      const id = host.id;
      const hasSignedIn = isToolId(id) && (await api.isToolSignedIn(id).catch(() => false));

      // An answer about a host the picker has moved on from is dropped: it would end the asking for the host on
      // show, and `waiting` doesn't start it again while that one waits too. The other is asked again once back.
      return hasSignedIn && id === hostOnShow.current ? id : null;
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
