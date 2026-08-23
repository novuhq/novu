'use client';

import type { AgentPendingAction, UseAgentChatResult } from '@novu/react';
import { useState } from 'react';
import { ArrowUpRightIcon, PlugIcon, ShieldIcon } from './icons';
import { safeExternalUrl } from './message-utils';

type RespondToAction = UseAgentChatResult['respondToAction'];
type Decision = Parameters<RespondToAction>[0]['decision'];

type PendingActionCardProps = {
  action: AgentPendingAction;
  disabled: boolean;
  onRespond: RespondToAction;
};

export function PendingActionCard({ action, disabled, onRespond }: PendingActionCardProps) {
  if (action.type === 'mcp-connection') {
    return <McpConnectionCard action={action} />;
  }

  return <ToolApprovalCard action={action} disabled={disabled} onRespond={onRespond} />;
}

function McpConnectionCard({ action }: { action: Extract<AgentPendingAction, { type: 'mcp-connection' }> }) {
  const authorizeUrl = safeExternalUrl(action.authorizeUrlWithAutoApprove || action.authorizeUrl);

  return (
    <section className="pending-action">
      <span className="pending-action-icon" aria-hidden>
        <PlugIcon />
      </span>
      <div className="pending-action-copy">
        <h2>Connect {action.displayName}</h2>
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

function ToolApprovalCard({
  action,
  disabled,
  onRespond,
}: {
  action: Extract<AgentPendingAction, { type: 'tool-approval' }>;
  disabled: boolean;
  onRespond: RespondToAction;
}) {
  const [busy, setBusy] = useState<Decision>();
  const [failure, setFailure] = useState<string>();

  async function respond(decision: Decision) {
    if (disabled || busy) return;

    setBusy(decision);
    setFailure(undefined);

    try {
      const result = await onRespond({ actionId: action.id, decision });
      if (result.error) setFailure(result.error.message);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section className="pending-action pending-action-approval">
      <span className="pending-action-icon pending-action-icon-warning" aria-hidden>
        <ShieldIcon />
      </span>

      <div className="pending-action-copy">
        <h2>
          Run <code>{action.toolName}</code>?
        </h2>
        <p>The agent is waiting for your approval.</p>
        {Object.keys(action.input ?? {}).length > 0 ? (
          <details>
            <summary>Review arguments</summary>
            <pre>{JSON.stringify(action.input, null, 2)}</pre>
          </details>
        ) : null}
        {failure ? (
          <p className="pending-action-error" role="alert">
            {failure}
          </p>
        ) : null}
      </div>

      <div className="pending-action-buttons">
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
        {action.trustToolActionId ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={disabled || Boolean(busy)}
            onClick={() => void respond('trust-tool')}
          >
            Always allow this tool
          </button>
        ) : null}
        {action.trustServerActionId && action.source?.type === 'mcp' ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={disabled || Boolean(busy)}
            onClick={() => void respond('trust-server')}
          >
            Always allow {action.source.serverName}
          </button>
        ) : null}
      </div>
    </section>
  );
}
