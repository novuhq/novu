'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useConnectionPoll } from '@/components/channels/setup-parts';
import { HostPicker } from '@/components/connect/host-picker';
import { HostPanel } from '@/components/connect/host-steps';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { MascotFace } from '@/components/ui/mascot-face';
import { useCodeWatch } from '@/hooks/use-code-watch';
import { useHostConnectCode } from '@/hooks/use-connect-code';
import { useHostBaseline } from '@/hooks/use-host-baseline';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import type { ConnectApi } from '@/lib/host-status';
import { DEFAULT_HOST, type HostId, hostOf, isHostId } from '@/lib/hosts';
import type { HostVia } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/** How long the steps take to fade out before "connected" rises in. */
const SWAP_MS = 200;

/** How often the drawer checks for a new host and asks about its codes, while it's open. */
const CHECK_EVERY_MS = 5_000;

type ConnectAgentDrawerProps = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The agent's email address, which a chat app's prompt names; `null` while it has none. */
  address?: string | null;
  /** The API the account lives on. */
  apiUrl: string;
  /** The hosted MCP server the chat apps connect to, or `null` while there is none. */
  mcpUrl: string | null;
  docsUrl: string;
  /**
   * The hosts connected now, which the picker ticks (`connectedHostIds`): those that checked the inbox, or
   * used a code, within the last day, and the chat apps (and Cursor) that signed in to the MCP server.
   */
  connectedHosts: readonly HostId[];
  /** The host the picker shows when the drawer opens, such as the one a host page's "sign in" link named. */
  initialHost?: HostId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ConnectApi;
};

/**
 * "Connect another agent" (`4.7`), with the onboarding's host picker and box over the steps
 * (`1.4 · Connect · prompt`): the hosts that run commands get a tab with the commands that connect them with
 * a one-time code, run in the person's terminal, and one for their second way in (a plugin, or the MCP
 * server); the chat apps get their steps in the app and a prompt. A fresh code is asked for every time it
 * opens, and each host that runs commands gets its own (`useHostConnectCode`), so the API knows which host
 * used it.
 *
 * For as long as it's open it watches for a host that comes in: a way in that's new, or one that came back
 * after a day without checks, or a code it showed getting used, which the API tells (`useCodeWatch`). The
 * drawer then says so, and the page reloads so the agent's card and the Agent setup row show it. A code the
 * API says ran out, or doesn't know, is swapped for a fresh one. A chat app watches for its own sign-in
 * (`HostPanel`) and says so in its own place, under the picker.
 */
export function ConnectAgentDrawer({
  handle,
  address,
  apiUrl,
  mcpUrl,
  docsUrl,
  connectedHosts,
  initialHost,
  open,
  onOpenChange,
  api,
}: ConnectAgentDrawerProps) {
  const router = useRouter();
  const [newHost, setNewHost] = useState<Arrival | null>(null);
  const [host, setHost] = useState<HostId>(initialHost ?? DEFAULT_HOST);
  const connected = useMemo(() => new Set<HostId>(connectedHosts), [connectedHosts]);
  // A chat app that signed in to the MCP server while its steps were on show already said so in its box
  // (`4c.2`): its first check through the MCP server, which the drawer would take for a new host, isn't news.
  const [chatSignedIn, setChatSignedIn] = useState(false);

  // Every opening starts over: a new code, and nothing connected yet. Done while
  // rendering, so the drawer never shows what the last opening ended on.
  const [wasOpen, setWasOpen] = useState(open);
  const [openings, setOpenings] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNewHost(null);
      setChatSignedIn(false);
      setOpenings((count) => count + 1);
      if (initialHost) {
        setHost(initialHost);
      }
    }
  }

  const watching = open && !newHost;
  const createCode = useCallback((forHost: HostId) => api.createCode(handle, forHost), [api, handle]);
  const { state: code, renew, retry } = useHostConnectCode(createCode, host, watching);
  const hosts = useHostBaseline(api.readHosts, watching);
  const codes = useCodeWatch(api.readCodeStatus, code.status === 'ready' ? code.code : null, watching);

  useConnectionPoll<Arrival>({
    waiting: watching,
    // It watches for as long as it's open: the code on screen is renewed before it runs out, so a host can
    // come in with it at any time, from a copy made long after the drawer opened.
    giveUpAfterMs: null,
    everyMs: CHECK_EVERY_MS,
    check: async () => {
      // A tab out of sight asks nothing; it picks up again as soon as the operator comes back to it.
      if (document.visibilityState === 'hidden') {
        return null;
      }

      const [arrived, codeWatch] = await Promise.all([hosts.check(), codes.check()]);
      if (arrived?.via === 'mcp' && chatSignedIn) {
        // Compared from here on: another host that comes in after it still counts.
        hosts.reset();
      } else if (arrived) {
        return { via: arrived.via, host: arrived.id ?? null };
      }

      // A code is only ever used by `agentinbox connect`, by the host it was asked for.
      if (codeWatch !== null && codeWatch !== 'renew') {
        return { via: 'cli', host: codeWatch.used.host ?? null };
      }

      if (codeWatch === 'renew') {
        renew();
      }

      return null;
    },
    onConnected: (arrival) => {
      setNewHost(arrival);
      router.refresh();
    },
  });

  const onSignedIn = (id: HostId) => {
    if (hostOf(id).group === 'chat') {
      setChatSignedIn(true);
      return;
    }

    // A coding agent's box stays as it is, so the drawer says it came in, as it does for the CLI. The box's tabs
    // are back on the next opening, with the CLI's own steps.
    setNewHost({ via: 'mcp', host: id });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        breadcrumb="Configure / Agent setup"
        title="Connect another agent"
        className="max-w-140"
        // 14px above and below the header, 20px on the left and 14px on the right, next to the close button.
        headerClassName="items-center gap-2.5 border-b border-border py-3.5 pr-3.5 pl-5 [&>button]:m-0 [&>div]:gap-px"
        titleClassName="leading-5.5"
        bodyClassName="gap-0 p-5"
        footerClassName="px-5 py-3.5"
        footer={
          <>
            <p className="mr-auto text-xs leading-4 text-muted">New agents show up in Agent setup.</p>
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          </>
        }
      >
        <Swapping key={openings} view={newHost ? 'connected' : 'connect'}>
          {(shown) =>
            shown === 'connected' ? (
              <Connected handle={handle} agent={newHost?.host ?? null} />
            ) : (
              <>
                <HostPicker selected={host} onSelect={setHost} connected={connected} />
                <HostPanel
                  selected={host}
                  handle={handle}
                  address={address}
                  apiUrl={apiUrl}
                  code={code}
                  onRetry={retry}
                  mcpUrl={mcpUrl}
                  docsUrl={docsUrl}
                  connected={connected}
                  api={api}
                  onSignedIn={onSignedIn}
                />
              </>
            )
          }
        </Swapping>
      </DrawerContent>
    </Drawer>
  );
}

type View = 'connect' | 'connected';

/** A host that came in: the way it came in, and which host it is when the drawer can tell. */
type Arrival = { via: HostVia; host: HostId | null };

/** The drawer's body. The two views differ in height; the block follows while one fades into the other. */
function Swapping({ view, children }: { view: View; children: (shown: View) => ReactNode }) {
  const { shown, leaving } = useSwap(view, SWAP_MS);
  const { ref, height } = useMeasuredHeight();

  return (
    <div
      style={{ height }}
      className="transition-[height] duration-300 ease-out motion-reduce:transition-none"
      aria-live="polite"
    >
      <div ref={ref}>
        <div
          key={shown}
          className={cn(
            'flex flex-col gap-4.5',
            leaving
              ? 'opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none'
              : shown === 'connected' && 'animate-rise-in motion-reduce:animate-none'
          )}
        >
          {children(shown)}
        </div>
      </div>
    </div>
  );
}

/**
 * What replaces the picker and the steps once a new host came in, however it did: with its code through the
 * CLI, signing in through its plugin or MCP config, or by checking the inbox. It names the host when the drawer
 * can tell which it is, as the chat apps' own "connected" does (`4c.2`), without an app to open. General is no
 * app of its own, so it is "your agent". The design draws none for this drawer.
 */
function Connected({ handle, agent }: { handle: string; agent: HostId | null }) {
  const name = agent && agent !== 'general' && isHostId(agent) ? hostOf(agent).name : null;

  return (
    <div className="flex flex-col items-center gap-3.5 py-10 text-center">
      <MascotFace art="waiting" mood="happy" className="size-40" />
      <h3 className="text-base leading-6 font-medium text-foreground">
        {name ?? 'Your agent'} is now {handle}
      </h3>
      <p className="text-[13px] leading-4.5 text-secondary">Try asking {name ?? 'it'}: “What’s new in your inbox?”</p>
    </div>
  );
}
