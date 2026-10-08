'use client';

import { ArrowUpRight, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { checkToolConnectedAction } from '@/app/(account)/(dashboard)/agent/actions';
import { useConnectionPoll, WaitingLine } from '@/components/channels/setup-parts';
import { Button, buttonClassName } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyField } from '@/components/ui/copy-field';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import { type AiTool, cursorInstallLink, cursorMcpConfig, type ToolId } from '@/lib/ai-tools';
import { cn } from '@/lib/utils';

/** How long the steps take to fade out before "connected" rises in. */
const SWAP_MS = 200;

type ConnectToolDrawerProps = {
  /** The tool to connect. The drawer keeps showing it while it slides shut. */
  tool: AiTool;
  /** The hosted Human MCP server the tool is pointed at. */
  mcpUrl: string;
  /** Whether the tool had signed in to the account when the page loaded. */
  connected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The drawer that walks through connecting one AI tool to Human: the tool adds the MCP server, and its
 * first use opens a Human sign-in window. A tile on the Agent page opens it. While it's open it asks
 * whether the tool has signed in, and the steps then give way to "connected".
 */
export function ConnectToolDrawer({ tool, mcpUrl, connected, open, onOpenChange }: ConnectToolDrawerProps) {
  const router = useRouter();
  // Known before the page has been reloaded with it.
  const [signedIn, setSignedIn] = useState(false);
  const isConnected = connected || signedIn;

  useConnectionPoll({
    waiting: open && !isConnected,
    check: async () => (await checkToolConnectedAction(tool.id)) || null,
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
        icon={<ToolIcon tool={tool} className="size-10 rounded-[9px]" />}
        className="max-w-140"
        // The connect drawers keep 20px to the edges and a line under the header, with the close button level with its top.
        headerClassName="items-center gap-3.75 border-b border-border px-5 py-4.5 [&>button]:m-0 [&>button]:self-start"
        bodyClassName="gap-0 px-5 pt-4.5"
        footerClassName="px-5"
        footer={<Footer tool={tool} connected={showsConnected} />}
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
                'flex flex-col',
                leaving
                  ? 'opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none'
                  : 'animate-rise-in motion-reduce:animate-none'
              )}
            >
              {showsConnected ? <Connected tool={tool} /> : <Steps tool={tool.id} mcpUrl={mcpUrl} />}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** A tool's logo on its rounded tile. */
export function ToolIcon({ tool, className }: { tool: AiTool; className?: string }) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden', className)}>
      <img src={tool.icon} alt="" className="size-full" />
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] ring-1 ring-white/8 ring-inset" />
    </span>
  );
}

function Footer({ tool, connected }: { tool: AiTool; connected: boolean }) {
  if (connected || !tool.settingsUrl) {
    return (
      <DrawerClose asChild>
        <Button variant={connected ? 'primary' : 'secondary'}>Done</Button>
      </DrawerClose>
    );
  }

  return (
    <a href={tool.settingsUrl} target="_blank" rel="noreferrer" className={buttonClassName('primary')}>
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
      Open {tool.name} settings
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Steps({ tool, mcpUrl }: { tool: ToolId; mcpUrl: string }) {
  if (tool === 'cursor') {
    return <CursorSteps mcpUrl={mcpUrl} />;
  }

  return tool === 'claude' ? <ClaudeSteps mcpUrl={mcpUrl} /> : <ChatGptSteps mcpUrl={mcpUrl} />;
}

function ChatGptSteps({ mcpUrl }: { mcpUrl: string }) {
  return (
    <>
      <Intro>Add Human as an MCP App so ChatGPT can ask you before it acts.</Intro>
      <StepList>
        <Step index={1} title="Add MCP Server">
          In ChatGPT, open Settings › Plugins › Add › Add MCP Server.
        </Step>
        <Step
          index={2}
          title="Connect to a custom MCP"
          extra={
            <CopyField
              value={mcpUrl}
              label="Copy the Human MCP URL"
              action="Copy"
              className="py-2.25 pr-2.25 pl-3.25"
            />
          }
        >
          Name it Human, switch to Streamable HTTP and paste this URL.
        </Step>
        <Step index={3} title="Sign in to Human">
          ChatGPT opens a sign-in window. Approve it and you are done.
        </Step>
      </StepList>
      <WaitingLine className="mt-5.5">Waiting for ChatGPT to connect…</WaitingLine>
    </>
  );
}

function ClaudeSteps({ mcpUrl }: { mcpUrl: string }) {
  return (
    <>
      <Intro>Works in Claude on the web, desktop and mobile.</Intro>
      <StepList>
        <Step index={1} title="Open your connectors">
          In Claude, open Settings › Connectors and choose Add custom connector.
        </Step>
        <Step
          index={2}
          title="Add custom connector"
          extra={<CopyField value={mcpUrl} label="Copy the Human MCP URL" className="pl-3.25" />}
        >
          Name it Human and paste this URL.
        </Step>
        <Step index={3} title="Connect and sign in">
          Click Connect, then approve Human in the window that opens.
        </Step>
      </StepList>
      <WaitingLine className="mt-5.5">Waiting for Claude to connect…</WaitingLine>
    </>
  );
}

function CursorSteps({ mcpUrl }: { mcpUrl: string }) {
  const [installLink] = useState(() => cursorInstallLink(mcpUrl));

  return (
    <>
      <Intro>One click adds the Human MCP server to Cursor.</Intro>
      <a href={installLink} className={buttonClassName('primary', 'mt-4.5 self-start')}>
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        Add to Cursor
      </a>
      <p className="mt-6 text-xs leading-4 text-muted">Or add it to ~/.cursor/mcp.json</p>
      <CodeBlock code={cursorMcpConfig(mcpUrl)} label="Copy the MCP config" className="mt-2.5 rounded-md" />
      <p className="mt-5 flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-xs leading-4 text-secondary">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        The first time Cursor asks someone, it opens a sign-in link. Approve it once.
      </p>
    </>
  );
}

function Intro({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-5.25 text-secondary">{children}</p>;
}

function StepList({ children }: { children: ReactNode }) {
  return <ol className="mt-5.25 flex flex-col gap-4.5">{children}</ol>;
}

type StepProps = {
  index: number;
  title: string;
  /** A field or a button under the step's words. */
  extra?: ReactNode;
  children?: ReactNode;
};

/** One numbered step. All of a tool's steps show at once: they happen in the tool, not on this page. */
function Step({ index, title, extra, children }: StepProps) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-5.5 shrink-0 place-items-center rounded-full bg-raised font-mono text-[11px] leading-4 text-foreground ring-1 ring-border ring-inset"
      >
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[13px] leading-4.5 font-medium text-foreground">{title}</h3>
        {children && <p className="mt-1.75 text-xs leading-4 text-secondary">{children}</p>}
        {extra && <div className="mt-2.5">{extra}</div>}
      </div>
    </li>
  );
}

/** What replaces the steps once the tool has signed in. */
function Connected({ tool }: { tool: AiTool }) {
  return (
    <div className="flex flex-col items-center pt-20 text-center">
      <img src="/illustrations/mascot-happy.svg" alt="" width={140} height={140} className="size-35" />
      <h3 className="mt-5 text-base leading-6 font-medium text-foreground">{tool.name} is connected</h3>
      <p className="mt-2.5 text-[13px] leading-4.5 text-secondary">
        Try asking {tool.name}: “{tool.example}”
      </p>
      {tool.appUrl && (
        <a href={tool.appUrl} target="_blank" rel="noreferrer" className={buttonClassName('primary', 'mt-4.5')}>
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Open {tool.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
