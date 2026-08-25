'use client';

import type { AgentMessage, UseAgentChatResult } from '@novu/react';
import { useState } from 'react';
import { ArrowUpRightIcon, PlugIcon, ShieldIcon } from './icons';
import { safeExternalUrl } from './message-utils';

type RespondToAction = UseAgentChatResult['respondToAction'];
type Decision = Parameters<RespondToAction>[0]['decision'];
type ApprovalPart = Extract<AgentMessage['parts'][number], { type: 'approval' }>;
type McpConnectionPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;

export function McpConnectionCard({ part }: { part: McpConnectionPart }) {
  const authorizeUrl = safeExternalUrl(part.authorizeUrlWithAutoApprove || part.authorizeUrl);

  if (part.state !== 'pending') {
    const connected = part.state === 'connected';

    return (
      <span className="part-status">
        <span>{part.displayName}</span>
        <span aria-hidden>·</span>
        <span data-tone={connected ? 'ok' : 'danger'}>{connected ? 'Connected' : part.message || 'Failed'}</span>
      </span>
    );
  }

  return (
    <section className="decision-card">
      <span className="decision-card-icon" aria-hidden>
        <PlugIcon />
      </span>
      <div className="decision-card-copy">
        <h2>Connect {part.displayName}?</h2>
        <p>The agent needs authorization to continue.</p>
      </div>
      <a
        className="button button-primary"
        href={authorizeUrl}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!authorizeUrl}
        onClick={(event) => {
          if (!authorizeUrl) event.preventDefault();
        }}
      >
        Authorize
        <ArrowUpRightIcon />
      </a>
    </section>
  );
}

export function ToolApprovalCard({
  part,
  disabled,
  onRespond,
}: {
  part: ApprovalPart;
  disabled: boolean;
  onRespond: RespondToAction;
}) {
  const [busy, setBusy] = useState<Decision>();
  const [failure, setFailure] = useState<string>();

  if (part.state !== 'pending') {
    const approved = part.state === 'approved';

    return (
      <span className="part-status">
        <code>{part.toolName}</code>
        <span aria-hidden>·</span>
        <span data-tone={approved ? 'ok' : 'danger'}>{approved ? 'Approved' : 'Denied'}</span>
      </span>
    );
  }

  async function respond(decision: Decision) {
    if (disabled || busy) return;

    setBusy(decision);
    setFailure(undefined);

    try {
      const result = await onRespond({ actionId: part.approvalId, decision });
      if (result.error) setFailure(result.error.message);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section className="decision-card">
      <span className="decision-card-icon decision-card-icon-warning" aria-hidden>
        <ShieldIcon />
      </span>

      <div className="decision-card-copy">
        <h2>
          Run <code>{part.toolName}</code>?
        </h2>
        <p>The agent is waiting for your approval.</p>
        {Object.keys(part.input ?? {}).length > 0 ? (
          <details>
            <summary>Review arguments</summary>
            <pre>{JSON.stringify(part.input, null, 2)}</pre>
          </details>
        ) : null}
        {failure ? (
          <p className="decision-card-error" role="alert">
            {failure}
          </p>
        ) : null}
      </div>

      <div className="decision-card-buttons">
        <button
          type="button"
          className="button button-secondary"
          disabled={disabled || Boolean(busy)}
          onClick={() => void respond('denied')}
        >
          {busy === 'denied' ? <span className="spinner" aria-hidden /> : null}
          Deny
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={disabled || Boolean(busy)}
          onClick={() => void respond('approved')}
        >
          {busy === 'approved' ? <span className="spinner" aria-hidden /> : null}
          Approve once
        </button>
        {part.trustToolActionId ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={disabled || Boolean(busy)}
            onClick={() => void respond('trust-tool')}
          >
            Always allow this tool
          </button>
        ) : null}
        {part.trustServerActionId && part.source?.type === 'mcp' ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={disabled || Boolean(busy)}
            onClick={() => void respond('trust-server')}
          >
            Always allow {part.source.serverName}
          </button>
        ) : null}
      </div>
    </section>
  );
}
