'use client';

import { Fragment, useState } from 'react';
import { CopyButton } from '@/components/sapien/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sapien/tabs';
import {
  getIntegrationCopyText,
  INTEGRATION_COPY_LABELS,
  INTEGRATIONS_LIST_LABEL,
  type Integration,
  type IntegrationSnippet,
  integrationsAssets,
} from '@/data/sapien-integrations';
import { cn } from '@/lib/utils';

import { Artwork } from './artwork';

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
            className="w-full min-w-0 border-b border-sapien-surface pt-3 pb-2.75 pl-4 text-left text-xl leading-none tracking-[-0.04em] text-sapien-foreground/50 hover:text-sapien-foreground/80 data-[state=active]:text-accent max-md:nth-[4n]:border-b-0 md:text-2xl md:last:border-b-0"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="flex h-94 min-w-0 flex-col overflow-clip rounded-[14px] bg-border shadow-[0_4px_68px_0_rgb(0_0_0/25%)]">
        <Artwork asset={integrationsAssets.imgControls} className="mt-4 ml-4 shrink-0" />
        {/* 25.4px top padding lines the transcript's rendered rows up with Figma's (which
            spaces 23.8px lines inside a 144px text box) instead of drifting 1-2px high. */}
        {items.map((item) => (
          <TabsContent
            key={item.id}
            value={item.id}
            className="min-h-0 flex-1 overflow-auto px-4 pt-[25.4px] pb-3 focus-visible:-outline-offset-2"
          >
            <TerminalSnippet snippet={item.snippet} />
          </TabsContent>
        ))}
        {active ? (
          <div className="flex shrink-0 flex-col px-3 pb-3">
            <CopyButton
              key={active.id}
              text={getIntegrationCopyText(active.snippet)}
              className="h-10 w-full rounded-lg bg-sapien-surface p-2 text-[15px] leading-none font-medium tracking-tight text-white hover:bg-sapien-raised"
            >
              {INTEGRATION_COPY_LABELS[active.snippet.kind]}
            </CopyButton>
          </div>
        ) : null}
      </div>
    </Tabs>
  );
}

function TerminalSnippet({ snippet }: { snippet: IntegrationSnippet }) {
  return (
    <pre className="w-max min-w-full font-mono text-sm leading-[1.7] tracking-[-0.03em] text-sapien-foreground">
      <code className="font-mono">
        {snippet.kind === 'commands' ? (
          snippet.lines.map((line, index) => (
            <Fragment key={index}>
              {line ? (
                <>
                  {/* A command's own line gets the prompt; the indented lines that go on with it don't. */}
                  {line.startsWith(' ') ? null : (
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
              {'\n\n'}
            </span>
            {snippet.code}
          </>
        )}
      </code>
    </pre>
  );
}
