'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useState } from 'react';

import { useConnectionPoll } from '@/components/channels/setup-parts';
import { ChatAppList } from '@/components/connect/chat-app-list';
import { ConnectPromptBox, type ConnectTab } from '@/components/connect/connect-prompt-box';
import { ConnectToolDrawer } from '@/components/connect/connect-tool-drawer';
import { InstallSkillsButton } from '@/components/connect/install-skills-button';
import { ToolChips } from '@/components/onboarding/identity-stage';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { MascotFace } from '@/components/ui/mascot-face';
import { useCodeWatch } from '@/hooks/use-code-watch';
import { useConnectCode } from '@/hooks/use-connect-code';
import { useHostBaseline } from '@/hooks/use-host-baseline';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import { AI_TOOLS, type AiTool, type ToolId } from '@/lib/ai-tools';
import type { ConnectApi } from '@/lib/host-status';
import type { HostVia } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/** How long the steps take to fade out before "connected" rises in. */
const SWAP_MS = 200;

/** How often the drawer checks for a new host and asks about its codes, while it's open. */
const CHECK_EVERY_MS = 5_000;

type ConnectAgentDrawerProps = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The agent's address, or `null` while it has none. */
  address: string | null;
  /** The API the account lives on. */
  apiUrl: string;
  /** The hosted MCP server the chat apps connect to, or `null` while there is none. */
  mcpUrl: string | null;
  docsUrl: string;
  /** The chat apps that have signed in to the account. */
  connectedTools: ToolId[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ConnectApi;
  /** The tab the prompt box opens on. The prompt comes first: not every agent has a terminal. */
  initialTab?: ConnectTab;
};

/**
 * "Connect another agent" (`4.7`): the prompt that connects any agent with a one-time code, the same as
 * commands for a terminal, the skills, and the chat apps that connect through the MCP server, each with
 * its own drawer over this one. A fresh code is asked for every time it opens.
 *
 * For as long as it's open it watches for a host that comes in: a way in that's new, or one that came back
 * after a day without checks, or a code it showed getting used, which the API tells (`useCodeWatch`). The
 * drawer then says so, and the page reloads so the agent's card and the Agent setup row show it. A code the
 * API says ran out, or doesn't know, is swapped for a fresh one.
 */
export function ConnectAgentDrawer({
  handle,
  address,
  apiUrl,
  mcpUrl,
  docsUrl,
  connectedTools,
  open,
  onOpenChange,
  api,
  initialTab,
}: ConnectAgentDrawerProps) {
  const router = useRouter();
  const [newHost, setNewHost] = useState<HostVia | null>(null);
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  // The app whose drawer was opened last, so that drawer keeps its words while it slides shut.
  const [drawerTool, setDrawerTool] = useState<AiTool>(AI_TOOLS[0]);

  // Every opening starts over: a new code, the Prompt tab, and nothing connected yet. Done while
  // rendering, so the drawer never shows what the last opening ended on.
  const [wasOpen, setWasOpen] = useState(open);
  const [openings, setOpenings] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNewHost(null);
      setOpenTool(null);
      setOpenings((count) => count + 1);
    }
  }

  const watching = open && !newHost;
  const createCode = useCallback(() => api.createCode(handle), [api, handle]);
  const { state: code, renew, retry } = useConnectCode(createCode, watching);
  // A chat app's drawer watches for its own sign-in while it covers this one.
  const hosts = useHostBaseline(api.readHosts, watching && openTool === null);
  // The codes outlive a chat app's drawer: one used while it covered this one still counts.
  const codes = useCodeWatch(api.readCodeStatus, code.status === 'ready' ? code.code : null, watching);

  useConnectionPoll<HostVia>({
    waiting: watching && openTool === null,
    // It watches for as long as it's open: the code on screen is renewed before it runs out, so a host can
    // come in with it at any time, from a copy made long after the drawer opened.
    giveUpAfterMs: null,
    everyMs: CHECK_EVERY_MS,
    check: async () => {
      // A tab out of sight asks nothing; it picks up again as soon as the operator comes back to it.
      if (document.visibilityState === 'hidden') {
        return null;
      }

      const [via, codeWatch] = await Promise.all([hosts.check(), codes.check()]);
      if (via) {
        return via;
      }

      // A code is only ever used by `agentinbox connect`.
      if (codeWatch === 'used') {
        return 'cli';
      }

      if (codeWatch === 'renew') {
        renew();
      }

      return null;
    },
    onConnected: (via) => {
      setNewHost(via);
      router.refresh();
    },
  });

  function openApp(tool: AiTool) {
    setDrawerTool(tool);
    setOpenTool(tool.id);
  }

  return (
    <>
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
                <Connected handle={handle} />
              ) : (
                <>
                  <p className="text-[13px] leading-[19px] text-secondary">
                    Paste this into any agent, or run the command.
                  </p>
                  <ConnectPromptBox
                    handle={handle}
                    address={address}
                    apiUrl={apiUrl}
                    code={code}
                    onRetry={retry}
                    initialTab={initialTab}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
                    <span>Works with</span>
                    {/* Claude Code, Cursor and ChatGPT, overlapping by 4px, with Cursor's tilted. */}
                    <ToolChips className="gap-0 [&_img]:rounded-[3.5px] [&>*:nth-child(2)]:-rotate-4 [&>*:not(:first-child)]:-ml-1" />
                    <span>and anything that runs a command or MCP</span>
                    <InstallSkillsButton className="ml-auto" />
                  </div>
                  <h3 className="font-mono text-[11px] leading-4 font-medium text-muted uppercase">Chat apps</h3>
                  <ChatAppList connectedTools={connectedTools} mcpUrl={mcpUrl} docsUrl={docsUrl} onOpen={openApp} />
                </>
              )
            }
          </Swapping>
        </DrawerContent>
      </Drawer>

      {mcpUrl !== null && (
        <ConnectToolDrawer
          // Each app gets a drawer of its own, so what one learned about its connection stays with it.
          key={drawerTool.id}
          tool={drawerTool}
          mcpUrl={mcpUrl}
          handle={handle}
          connected={connectedTools.includes(drawerTool.id)}
          open={open && openTool !== null}
          onOpenChange={(isOpen) => setOpenTool(isOpen ? drawerTool.id : null)}
          // Connected, the app's "Done" closes this drawer too: there is nothing left to do here.
          onDone={() => onOpenChange(false)}
          nested
          api={api}
        />
      )}
    </>
  );
}

type View = 'connect' | 'connected';

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
 * What replaces the prompt once a new host came in. The design draws none for this drawer; it follows
 * the chat apps' "connected" (`4c.2`), without an app to open.
 */
function Connected({ handle }: { handle: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-10 text-center">
      <MascotFace art="waiting" mood="happy" className="size-40" />
      <h3 className="text-base leading-6 font-medium text-foreground">Your agent is now {handle}</h3>
      <p className="text-[13px] leading-4.5 text-secondary">Try asking it: “What’s new in your inbox?”</p>
    </div>
  );
}
