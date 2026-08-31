'use client';

import type { AgentMessage, UseWebChatResult } from '@novu/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ArrowUpRightIcon, ChevronIcon, PlugIcon, TerminalIcon } from './icons';
import { safeExternalUrl } from './message-utils';

type RespondToAction = UseWebChatResult['respondToAction'];
type Decision = Parameters<RespondToAction>[0]['decision'];
type ApprovalPart = Extract<AgentMessage['parts'][number], { type: 'approval' }>;
type McpConnectionPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function PayloadPeek({ label, value }: { label: string; value: string }) {
  return (
    <div className="payload-peek">
      <span className="payload-peek-label">{label}</span>
      <pre className="payload-peek-value">{value}</pre>
    </div>
  );
}

function ExpandableRow({
  id,
  className,
  summary,
  children,
}: {
  id?: string;
  className?: string;
  summary: ReactNode;
  children?: ReactNode;
}) {
  if (!children) {
    return (
      <span id={id} className={className}>
        {summary}
      </span>
    );
  }

  return (
    <details id={id} className={`expandable-row${className ? ` ${className}` : ''}`}>
      <summary>{summary}</summary>
      <div className="expandable-body">{children}</div>
    </details>
  );
}

function ToolApprovalActions({
  disabled,
  busy,
  onRespond,
  trustToolActionId,
  trustServerActionId,
  source,
}: {
  disabled: boolean;
  busy?: Decision;
  onRespond: (decision: Decision) => void;
  trustToolActionId?: string;
  trustServerActionId?: string;
  source?: ApprovalPart['source'];
}) {
  const trustServerLabel = trustServerActionId && source?.type === 'mcp' ? source.serverName : undefined;
  const hasTrustActions = Boolean(trustToolActionId) || Boolean(trustServerLabel);

  return (
    <div className={`decision-card-actions${hasTrustActions ? ' decision-card-actions-split' : ''}`}>
      {hasTrustActions ? (
        <div className="decision-card-trust">
          {trustToolActionId ? (
            <button
              type="button"
              className="button button-secondary"
              disabled={disabled || Boolean(busy)}
              onClick={() => onRespond('trust-tool')}
            >
              {busy === 'trust-tool' ? <span className="spinner" aria-hidden /> : null}
              Always allow for this tool
            </button>
          ) : null}
          {trustServerLabel ? (
            <button
              type="button"
              className="button button-secondary"
              disabled={disabled || Boolean(busy)}
              onClick={() => onRespond('trust-server')}
            >
              {busy === 'trust-server' ? <span className="spinner" aria-hidden /> : null}
              Always allow {trustServerLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="decision-card-primary-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={disabled || Boolean(busy)}
          onClick={() => onRespond('denied')}
        >
          {busy === 'denied' ? <span className="spinner" aria-hidden /> : null}
          Deny
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={disabled || Boolean(busy)}
          onClick={() => onRespond('approved')}
        >
          {busy === 'approved' ? <span className="spinner" aria-hidden /> : null}
          Approve once
        </button>
      </div>
    </div>
  );
}

export function McpConnectionCard({ part }: { part: McpConnectionPart }) {
  const authorizeUrl = safeExternalUrl(part.authorizeUrlWithAutoApprove || part.authorizeUrl);

  if (part.state !== 'pending') {
    const connected = part.state === 'connected';

    return (
      <span className="part-status">
        <ChevronIcon size={14} className="part-status-chevron" />
        <span>{part.displayName}</span>
        <span aria-hidden>·</span>
        <span data-tone={connected ? 'ok' : 'danger'}>{connected ? 'Connected' : part.message || 'Failed'}</span>
      </span>
    );
  }

  return (
    <section className="decision-card decision-card-mcp">
      <span className="decision-card-mcp-icon" aria-hidden>
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
  const inputPreview = part.input && Object.keys(part.input).length > 0 ? prettyJson(part.input) : undefined;

  if (part.state !== 'pending') {
    const approved = part.state === 'approved';

    return (
      <ExpandableRow
        summary={
          <span className="part-status">
            <ChevronIcon size={14} className="expandable-chevron" />
            <code>{part.toolName}</code>
            <span aria-hidden>·</span>
            <span data-tone={approved ? 'ok' : 'danger'}>{approved ? 'Approved' : 'Denied'}</span>
          </span>
        }
      >
        {inputPreview ? <PayloadPeek label="Input" value={inputPreview} /> : null}
      </ExpandableRow>
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
    <section className="decision-card decision-card-approval">
      <div className="decision-card-header">
        <div className="decision-card-title-row">
          <TerminalIcon size={20} />
          <h2>Run {part.toolName}?</h2>
        </div>
        <p>The agent is waiting for your approval.</p>
        {failure ? (
          <p className="decision-card-error" role="alert">
            {failure}
          </p>
        ) : null}
      </div>

      {inputPreview ? (
        <details className="decision-card-args">
          <summary>
            <ChevronIcon size={14} className="expandable-chevron" />
            Arguments
          </summary>
          <PayloadPeek label="Input" value={inputPreview} />
        </details>
      ) : null}

      <ToolApprovalActions
        disabled={disabled}
        busy={busy}
        onRespond={(decision) => void respond(decision)}
        trustToolActionId={part.trustToolActionId}
        trustServerActionId={part.trustServerActionId}
        source={part.source}
      />
    </section>
  );
}
