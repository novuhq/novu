'use client';

import type { AgentMessage } from '@novu/react';
import { ArrowUpRightIcon, CheckIcon, PlugIcon, XIcon } from 'lucide-react';
import { field, fieldInteractive, inkButton, paper } from './assistant-ui/elements/surfaces';
import { cn } from './lib/utils';
import { toSafeExternalUrl } from './lib/card-view';

type McpConnectionPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;

export function ConnectCard({ part }: { part: McpConnectionPart }) {
  const connectUrl = toSafeExternalUrl(part.authorizeUrl);
  const autoApproveUrl = toSafeExternalUrl(part.authorizeUrlWithAutoApprove);
  const pending = part.state === 'pending';
  const connected = part.state === 'connected';

  if (!pending) {
    return (
      <div
        data-slot="novu-connect-card"
        data-state={part.state}
        id={`mcp-connection-${part.actionId}`}
        className="text-muted-foreground flex w-fit items-center gap-2 py-1.5 text-sm"
      >
        {connected ? (
          <CheckIcon className="size-4 shrink-0 text-emerald-500" aria-hidden />
        ) : (
          <XIcon className="size-4 shrink-0" aria-hidden />
        )}
        <span>
          {connected ? 'Connected' : 'Failed to connect'}: <b>{part.displayName}</b>
        </span>
      </div>
    );
  }

  return (
    <section
      data-slot="novu-connect-card"
      data-state={part.state}
      id={`mcp-connection-${part.actionId}`}
      className={cn(paper, 'flex w-full max-w-sm flex-col gap-3.5 rounded-[20px] p-4')}
    >
      <div className="flex items-center gap-3">
        <span className="bg-foreground/[0.05] text-foreground/45 flex size-9 shrink-0 items-center justify-center rounded-xl">
          <PlugIcon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[13.5px] font-medium">Connect {part.displayName}</p>
          <p className="text-foreground/45 text-xs">Connection request</p>
        </div>
      </div>

      <p className={cn(field, 'text-foreground/70 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed')}>
        {part.message ?? `Connect your ${part.displayName} account so the agent can continue.`}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {autoApproveUrl ? (
          <a
            href={autoApproveUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              fieldInteractive,
              'text-foreground/70 flex h-8 items-center gap-1 rounded-full px-3.5 text-xs font-medium'
            )}
          >
            Connect & auto-approve
            <ArrowUpRightIcon className="size-3.5" />
          </a>
        ) : null}
        {connectUrl ? (
          <a
            href={connectUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(inkButton, 'flex h-8 items-center gap-1 rounded-full px-3.5 text-xs font-medium')}
          >
            Connect
            <ArrowUpRightIcon className="size-3.5" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
