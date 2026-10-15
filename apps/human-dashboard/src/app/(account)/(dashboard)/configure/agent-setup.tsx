'use client';

import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useId, useState } from 'react';

import { ConnectToolDrawer, ToolIcon } from '@/components/connect/connect-tool-drawer';
import { Badge } from '@/components/ui/badge';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { CopyField } from '@/components/ui/copy-field';
import { Fold } from '@/components/ui/stepper';
import { AI_TOOLS, type AiTool, type ToolId } from '@/lib/ai-tools';
import { cn } from '@/lib/utils';

export type AgentSetupTexts = {
  /** What to paste into a coding agent so it sets up Agent Inbox on its computer, logged in to this account. */
  prompt: string;
  /** The line to run in a terminal instead, with the account's key in it. */
  command: string;
  /** The same line as it's shown, with the key cut short. */
  commandDisplay: string;
};

type AgentSetupProps = {
  /** A host reads the agent's mail. */
  connected: boolean;
  setup: AgentSetupTexts;
  docsUrl: string;
  /** The hosted MCP server the chat apps connect to, or `null` while there is none. */
  mcpUrl: string | null;
  /** The chat apps that have signed in to the account. */
  connectedTools: ToolId[];
};

/**
 * The row for the agent behind the inbox: whether a host is connected, and "Show setup" with the ways to
 * set one up. The design opens a "Connect another agent" drawer from here, which comes with its one-time
 * code (NV-9037); until then the row folds open on what works today: the setup prompt, the command, and the
 * chat apps' connectors.
 */
export function AgentSetup({ connected, setup, docsUrl, mcpUrl, connectedTools }: AgentSetupProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="relative overflow-hidden rounded-[10px] border border-border bg-background">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-raised"
        >
          <Terminal className="size-3.5 text-foreground" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2 className="text-[13px] leading-4.5 font-medium text-foreground">Agent setup</h2>
          {/* A new key when a host connects, so its new status fades in. */}
          <span
            key={String(connected)}
            className="flex animate-overlay-in items-center gap-1.25 font-mono text-[11px] leading-3.5 text-secondary motion-reduce:animate-none"
          >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', connected ? 'bg-success' : 'bg-muted')} />
            {connected ? 'connected' : 'not connected'}
          </span>
        </div>
        <Button
          variant="quiet"
          className={SMALL_BUTTON}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((shown) => !shown)}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3.5 text-foreground transition-transform duration-200 ease-out motion-reduce:transition-none',
              open && 'rotate-180'
            )}
          />
          {open ? 'Hide setup' : 'Show setup'}
        </Button>
      </div>
      <Fold open={open}>
        <div id={panelId} className="flex flex-col gap-3 border-t border-border px-4 pt-3.5 pb-4">
          <p className="text-[13px] leading-4.5 text-secondary">
            Paste this prompt into Claude Code, Codex, Cursor or any agent to connect it to this inbox. Or run the
            command in your terminal.
          </p>
          <pre className="rounded-md border border-border-strong bg-subtle px-2.5 py-2 font-mono text-[11px] leading-4 whitespace-pre-wrap text-default">
            {setup.prompt}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={setup.prompt} label="Copy prompt" variant="primary" className={SMALL_BUTTON}>
              Copy prompt
            </CopyButton>
            <CopyField
              command
              value={setup.command}
              display={setup.commandDisplay}
              label="Copy setup command"
              className="min-w-64 flex-1"
            />
          </div>
          <ChatApps docsUrl={docsUrl} mcpUrl={mcpUrl} connectedTools={connectedTools} />
        </div>
      </Fold>
    </section>
  );
}

type ChatAppsProps = Pick<AgentSetupProps, 'docsUrl' | 'mcpUrl' | 'connectedTools'>;

/**
 * The chat apps that work as a host through the MCP server, one row each. A row opens the app's connect
 * drawer; while there is no MCP server to connect to, it opens the docs instead.
 */
function ChatApps({ docsUrl, mcpUrl, connectedTools }: ChatAppsProps) {
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  // The app whose drawer was opened last, so the drawer keeps its words while it slides shut.
  const [drawerTool, setDrawerTool] = useState<AiTool>(AI_TOOLS[0]);

  return (
    <>
      <h3 className="pt-1 font-mono text-[11px] leading-4 font-medium text-muted uppercase">Chat apps</h3>
      <ul className="overflow-hidden rounded-[10px] border border-border">
        {AI_TOOLS.map((tool) => {
          const connected = connectedTools.includes(tool.id);
          const row = (
            <>
              <ToolIcon tool={tool} className="size-6 rounded-[5px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[13px] leading-4.5 font-medium text-foreground">{tool.name}</span>
                <span className="truncate text-xs leading-4 text-secondary">{tool.label}</span>
              </span>
              {connected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
              )}
            </>
          );

          return (
            <li key={tool.id} className="border-b border-border last:border-b-0">
              {mcpUrl === null ? (
                <a href={docsUrl} target="_blank" rel="noreferrer" className={CHAT_APP_ROW}>
                  {row}
                  <span className="sr-only">(opens the docs in a new tab)</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerTool(tool);
                    setOpenTool(tool.id);
                  }}
                  className={CHAT_APP_ROW}
                >
                  {row}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {mcpUrl !== null && (
        <ConnectToolDrawer
          // Each app gets a drawer of its own, so what one learned about its connection stays with it.
          key={drawerTool.id}
          tool={drawerTool}
          mcpUrl={mcpUrl}
          connected={connectedTools.includes(drawerTool.id)}
          open={openTool !== null}
          onOpenChange={(isOpen) => setOpenTool(isOpen ? drawerTool.id : null)}
        />
      )}
    </>
  );
}

const CHAT_APP_ROW =
  'relative flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-raised focus-visible:-outline-offset-2 motion-reduce:transition-none';
