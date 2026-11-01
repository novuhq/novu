'use client';

import { type LucideIcon, Plug, Sparkles, SquareTerminal } from 'lucide-react';
import { Fragment, useState } from 'react';
import { CopyButton } from '@/components/sapien/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sapien/tabs';
import {
  getIntegrationCopyLabel,
  getIntegrationCopyText,
  INTEGRATIONS_LIST_LABEL,
  type Integration,
  type IntegrationSnippet,
  integrationsAssets,
} from '@/data/sapien-integrations';
import type { HostId } from '@/lib/hosts';
import { cn } from '@/lib/utils';

import { Artwork } from './artwork';
import { AgentLogo } from './brand-logo';

export function IntegrationsTabs({ items, className }: { items: readonly Integration[]; className?: string }) {
  const [value, setValue] = useState(items[0]?.id ?? '');
  const active = items.find((item) => item.id === value) ?? items[0];

  return (
    <Tabs
      value={value}
      onValueChange={setValue}
      orientation="vertical"
      className={cn('grid gap-8 md:grid-cols-[4fr_5fr] md:items-center lg:grid-cols-2', className)}
    >
      {/* Mobile: two columns filled top-to-bottom, so ArrowDown follows the visual order. */}
      <TabsList
        aria-label={INTEGRATIONS_LIST_LABEL}
        className="-mt-3 -mb-2.75 grid grid-flow-col grid-cols-2 grid-rows-4 gap-x-4 md:flex md:flex-col"
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            className="group/tab flex w-full min-w-0 items-center gap-2 border-b border-sapien-surface pt-3 pb-2.75 pl-1 text-left text-[17px] md:gap-3 leading-none tracking-[-0.04em] text-sapien-foreground/50 hover:text-sapien-foreground/80 data-[state=active]:text-sapien-foreground max-md:nth-[4n]:border-b-0 md:pl-3 md:text-2xl md:last:border-b-0"
          >
            <IntegrationLogo id={item.id} />
            <span className="truncate">{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="flex h-94 min-w-0 flex-col overflow-clip rounded-[14px] bg-sapien-border shadow-[0_4px_68px_0_rgb(0_0_0/25%)]">
        <Artwork asset={integrationsAssets.imgControls} className="mt-4 ml-4 shrink-0" />
        {/* 25.4px top padding lines the transcript's rendered rows up with Figma's (which
            spaces 23.8px lines inside a 144px text box) instead of drifting 1-2px high. */}
        {items.map((item) => (
          <TabsContent
            key={item.id}
            value={item.id}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-[25.4px] pb-3 focus-visible:-outline-offset-2"
          >
            <SnippetNote text={item.snippet.before} />
            {/* Notes wrap to the window; only the code scrolls sideways. */}
            <div className="min-w-0 shrink-0 overflow-x-auto">
              <TerminalSnippet snippet={item.snippet} />
            </div>
            <SnippetNote text={item.snippet.after} />
          </TabsContent>
        ))}
        {active ? (
          <div className="flex shrink-0 flex-col px-3 pb-3">
            <CopyButton
              key={active.id}
              text={getIntegrationCopyText(active.snippet)}
              className="h-10 w-full rounded-lg bg-sapien-surface p-2 text-[15px] leading-none font-medium tracking-tight text-white hover:bg-sapien-raised"
            >
              {getIntegrationCopyLabel(active.snippet)}
            </CopyButton>
          </div>
        ) : null}
      </div>
    </Tabs>
  );
}

/** Agent hosts show their own mark; the CLI, skills and MCP get an icon in a tile of the same size. */
const INTEGRATION_HOSTS: Partial<Record<string, HostId>> = {
  'claude-code': 'claude-code',
  cursor: 'cursor',
  'grok-bot': 'grok',
  hermes: 'hermes',
  openclaw: 'openclaw',
};
const INTEGRATION_ICONS: Partial<Record<string, LucideIcon>> = { cli: SquareTerminal, skills: Sparkles, mcp: Plug };

function IntegrationLogo({ id }: { id: string }) {
  const host = INTEGRATION_HOSTS[id];
  if (host) return <AgentLogo agent={host} className="opacity-60 group-data-[state=active]/tab:opacity-100" />;
  const Icon = INTEGRATION_ICONS[id];
  if (!Icon) return null;

  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sapien-surface text-sapien-foreground/60 ring-[0.75px] ring-white/8 ring-inset group-data-[state=active]/tab:bg-accent/15 group-data-[state=active]/tab:text-accent"
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
    </span>
  );
}

/** A muted note above or below the code: prose, so it wraps instead of scrolling with the code. */
function SnippetNote({ text }: { text?: string }) {
  return text ? (
    <p className="shrink-0 font-sapien-mono text-[13px] leading-[1.45] tracking-[-0.03em] text-sapien-foreground/50">
      {text}
    </p>
  ) : null;
}

function TerminalSnippet({ snippet }: { snippet: IntegrationSnippet }) {
  return (
    <pre className="w-max min-w-full font-sapien-mono text-sm leading-[1.7] tracking-[-0.03em] text-sapien-foreground">
      <code className="font-sapien-mono">
        {snippet.kind === 'commands' || snippet.kind === 'steps' ? (
          snippet.lines.map((line, index) => (
            <Fragment key={index}>
              {line ? (
                <>
                  {/* A command's own line gets the prompt; the indented lines that go on with it, and steps, don't. */}
                  {snippet.kind === 'steps' || line.startsWith(' ') ? null : (
                    <span aria-hidden="true" className="text-sapien-foreground/50 select-none">
                      ${' '}
                    </span>
                  )}
                  {line}
                </>
              ) : null}
              {index < snippet.lines.length - 1 ? '\n' : null}
            </Fragment>
          ))
        ) : (
          <>
            <span className="text-sapien-foreground/50 select-none">
              {snippet.file}
              {'\n'}
            </span>
            {snippet.code}
          </>
        )}
      </code>
    </pre>
  );
}
