'use client';

import type { AgentMessage } from '@novu/react';
import { ArrowUpRightIcon, CheckIcon, PlugIcon, XIcon } from './icons';

type McpConnectionPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;

function stateMeta(state: McpConnectionPart['state']): { label: string; tone: 'pending' | 'ok' | 'danger' } {
  switch (state) {
    case 'connected':
      return { label: 'Connected', tone: 'ok' };
    case 'failed':
      return { label: 'Failed', tone: 'danger' };
    default:
      return { label: 'Action needed', tone: 'pending' };
  }
}

export function ConnectCard({ part }: { part: McpConnectionPart }) {
  const meta = stateMeta(part.state);

  return (
    <section className="action-card" data-state={part.state} id={`mcp-connection-${part.actionId}`}>
      <header className="action-card-head">
        <span className="action-icon" aria-hidden>
          <PlugIcon />
        </span>
        <div className="action-titles">
          <span className="action-kicker">Connection request</span>
          <h3 className="action-title">Connect {part.displayName}</h3>
        </div>
        <span className="action-status" data-tone={meta.tone}>
          {meta.label}
        </span>
      </header>

      <p className="action-note">
        {part.message ?? `Connect your ${part.displayName} account so the agent can continue.`}
      </p>

      {part.state === 'pending' ? (
        <footer className="action-foot">
          <code className="action-id" title={part.actionId}>
            {part.actionId}
          </code>
          <a className="action-btn action-btn-primary" href={part.authorizeUrl} target="_blank" rel="noreferrer">
            Connect {part.displayName}
            <ArrowUpRightIcon />
          </a>
        </footer>
      ) : (
        <footer className="action-foot">
          <span className="action-resolved">
            <span className="action-resolved-glyph" data-tone={meta.tone} aria-hidden>
              {part.state === 'connected' ? <CheckIcon size={11} /> : <XIcon size={10} />}
            </span>
            {part.state === 'connected' ? `${part.displayName} is connected` : `Connecting ${part.displayName} failed`}
          </span>
        </footer>
      )}
    </section>
  );
}
