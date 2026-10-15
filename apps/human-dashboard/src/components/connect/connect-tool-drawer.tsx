'use client';

import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { useConnectionPoll, WaitingLine } from '@/components/channels/setup-parts';
import { Button, buttonClassName } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyField } from '@/components/ui/copy-field';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { MascotFace } from '@/components/ui/mascot-face';
import { useHostBaseline } from '@/hooks/use-host-baseline';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import { type AiTool, cursorInstallLink, cursorMcpConfig } from '@/lib/ai-tools';
import type { ConnectApi } from '@/lib/host-status';
import { cn } from '@/lib/utils';

/** How long the steps take to fade out before "connected" rises in. */
const SWAP_MS = 200;

type ConnectToolDrawerProps = {
  /** The chat app to connect. The drawer keeps showing it while it slides shut. */
  tool: AiTool;
  /** The hosted MCP server the app is pointed at. */
  mcpUrl: string;
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  /** Whether the app had signed in to the account when the page loaded. */
  connected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Done" once the app is connected. Closes this drawer by default; one opened from another closes both. */
  onDone?: () => void;
  /** Opened from another drawer, which it covers: the page behind stays as dim as it was. */
  nested?: boolean;
  api: Pick<ConnectApi, 'readHosts' | 'isToolSignedIn'>;
};

/**
 * The drawer that walks through connecting a chat app to the agent's inbox (`4c.1 · ChatGPT`): the app adds
 * the MCP server, and its first use opens a sign-in window. While it's open it asks whether the app has
 * signed in, or whether a host came in through the MCP server, and the steps then give way to
 * "<app> is now <agent>" (`4c.2`). Only ChatGPT's is drawn; Claude's and Cursor's follow it with their own steps.
 */
export function ConnectToolDrawer({
  tool,
  mcpUrl,
  handle,
  connected,
  open,
  onOpenChange,
  onDone,
  nested = false,
  api,
}: ConnectToolDrawerProps) {
  const router = useRouter();
  // Known before the page has been reloaded with it.
  const [signedIn, setSignedIn] = useState(false);
  const isConnected = connected || signedIn;
  const hosts = useHostBaseline(api.readHosts, open && !isConnected);

  useConnectionPoll({
    waiting: open && !isConnected,
    check: async () => {
      const [appSignedIn, newHost] = await Promise.all([api.isToolSignedIn(tool.id).catch(() => false), hosts.check()]);

      return appSignedIn || newHost === 'mcp' || null;
    },
    onConnected: () => {
      setSignedIn(true);
      router.refresh();
    },
  });

  const { shown, leaving } = useSwap(isConnected ? 'connected' : 'steps', SWAP_MS);
  const { ref, height } = useMeasuredHeight();
  const showsConnected = shown === 'connected';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        eyebrow="Connect"
        title={tool.name}
        icon={<ToolIcon tool={tool} className="size-10 rounded-[8.75px]" />}
        className="max-w-140"
        // 18px above and below the header and 20px to the edges, with the close button level with its top.
        headerClassName="items-center gap-3 border-b border-border px-5 py-4.5 [&>button]:m-0 [&>button]:self-start"
        bodyClassName="gap-0 p-5"
        footerClassName="px-5"
        overlayClassName={nested ? 'bg-transparent' : undefined}
        footer={<Footer tool={tool} mcpUrl={mcpUrl} connected={showsConnected} onDone={onDone} />}
      >
        {/* The steps and "connected" differ in height; the block follows while one fades into the other. */}
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
              {showsConnected ? (
                <Connected tool={tool} handle={handle} />
              ) : (
                <Steps tool={tool} mcpUrl={mcpUrl} handle={handle} />
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** A chat app's logo on its rounded tile, with the faint inner line of the design's `Brand logo`. */
export function ToolIcon({ tool, className }: { tool: AiTool; className?: string }) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden', className)}>
      <img src={tool.icon} alt="" className="size-full" />
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] ring-1 ring-white/8 ring-inset" />
    </span>
  );
}

type FooterProps = { tool: AiTool; mcpUrl: string; connected: boolean; onDone?: () => void };

function Footer({ tool, mcpUrl, connected, onDone }: FooterProps) {
  const [cursorLink] = useState(() => (tool.id === 'cursor' ? cursorInstallLink(mcpUrl) : null));

  if (connected) {
    return onDone ? (
      <Button onClick={onDone}>Done</Button>
    ) : (
      <DrawerClose asChild>
        <Button>Done</Button>
      </DrawerClose>
    );
  }

  if (cursorLink) {
    return (
      <a href={cursorLink} className={buttonClassName('primary')}>
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        Add to Cursor
      </a>
    );
  }

  return tool.settingsUrl ? (
    <a href={tool.settingsUrl} target="_blank" rel="noreferrer" className={buttonClassName('primary')}>
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
      Open {tool.name} settings
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : null;
}

function Steps({ tool, mcpUrl, handle }: { tool: AiTool; mcpUrl: string; handle: string }) {
  const url = (
    <CopyField
      value={mcpUrl}
      // The design writes the address in the brighter text color.
      display={<span className="text-foreground">{mcpUrl}</span>}
      label="Copy the MCP server address"
      action="Copy"
    />
  );

  return (
    <>
      <p className="text-[13px] leading-4.5 text-secondary">
        Connect {tool.name} to {handle}’s inbox.
      </p>
      <ol className="flex flex-col gap-4.5">
        {tool.id === 'chatgpt' && (
          <>
            <Step index={1} title="Turn on developer mode">
              In ChatGPT, open Settings › Apps & Connectors › Advanced and switch on Developer mode.
            </Step>
            <Step index={2} title="Create a connector" extra={url}>
              Name it Inbox and paste this URL.
            </Step>
            <Step index={3} title="Sign in to Inbox">
              ChatGPT opens a sign-in window. Approve it and ChatGPT gets its address.
            </Step>
          </>
        )}
        {tool.id === 'claude' && (
          <>
            <Step index={1} title="Open your connectors">
              In Claude, open Settings › Connectors and choose Add custom connector.
            </Step>
            <Step index={2} title="Add a custom connector" extra={url}>
              Name it Inbox and paste this URL.
            </Step>
            <Step index={3} title="Sign in to Inbox">
              Click Connect and Claude opens a sign-in window. Approve it and Claude gets its address.
            </Step>
          </>
        )}
        {tool.id === 'cursor' && (
          <>
            <Step
              index={1}
              title="Add the MCP server"
              extra={<CodeBlock code={cursorMcpConfig(mcpUrl)} label="Copy the MCP config" className="rounded-md" />}
            >
              Add to Cursor does it in one click. Or add this to ~/.cursor/mcp.json.
            </Step>
            <Step index={2} title="Sign in to Inbox">
              The first time Cursor uses Inbox, it opens a sign-in window. Approve it and Cursor gets its address.
            </Step>
          </>
        )}
      </ol>
      <WaitingLine className="pl-0">Waiting for {tool.name} to connect…</WaitingLine>
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

/** What replaces the steps once the app has signed in (`4c.2`). */
function Connected({ tool, handle }: { tool: AiTool; handle: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-10 text-center">
      <MascotFace art="waiting" mood="happy" className="size-40" />
      <h3 className="text-base leading-6 font-medium text-foreground">
        {tool.name} is now {handle}
      </h3>
      <p className="text-[13px] leading-4.5 text-secondary">
        Try asking {tool.name}: “{tool.example}”
      </p>
      {tool.appUrl && (
        <a href={tool.appUrl} target="_blank" rel="noreferrer" className={buttonClassName('primary')}>
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Open {tool.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
