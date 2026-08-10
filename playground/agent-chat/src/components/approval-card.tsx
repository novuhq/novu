'use client';

import type { AgentApprovalPart, UseAgentChatResult } from '@novu/react';
import { useState } from 'react';
import { CheckIcon, ShieldIcon, XIcon } from './icons';

export type RespondToApproval = UseAgentChatResult['respondToApproval'];

type Decision = 'approved' | 'denied';

const STATE_COPY: Record<AgentApprovalPart['state'], { eyebrow: string; chip: string }> = {
  pending: { eyebrow: 'Approval required', chip: 'waiting' },
  approved: { eyebrow: 'Approval granted', chip: 'approved' },
  denied: { eyebrow: 'Approval denied', chip: 'denied' },
};

export function approvalDomId(approvalId: string): string {
  return `approval-${approvalId}`;
}

function sourceLabel(source: AgentApprovalPart['source']): string | undefined {
  if (!source) return undefined;

  return source.type === 'mcp' ? `mcp · ${source.serverName}` : source.type;
}

function ArgValue({ value }: { value: unknown }) {
  if (value === null || typeof value !== 'object') {
    return <span className="arg-scalar">{typeof value === 'string' ? value : JSON.stringify(value)}</span>;
  }

  return <pre className="arg-json">{JSON.stringify(value, null, 2)}</pre>;
}

function ArgList({ input }: { input: Record<string, unknown> }) {
  const entries = Object.entries(input);

  if (entries.length === 0) {
    return <p className="approval-empty">Tool takes no arguments.</p>;
  }

  return (
    <dl className="arg-list">
      {entries.map(([key, value]) => (
        <div className="arg-row" key={key}>
          <dt>{key}</dt>
          <dd>
            <ArgValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

type ApprovalCardProps = {
  part: AgentApprovalPart;
  onRespond?: RespondToApproval;
};

export function ApprovalCard({ part, onRespond }: ApprovalCardProps) {
  const [busy, setBusy] = useState<Decision | null>(null);
  const [failure, setFailure] = useState<string>();

  const isPending = part.state === 'pending';
  const copy = STATE_COPY[part.state];
  const source = sourceLabel(part.source);

  async function respond(decision: Decision) {
    if (!onRespond || busy) return;

    setBusy(decision);
    setFailure(undefined);

    try {
      const result = await onRespond({ approvalId: part.approvalId, decision });
      if (result.error) {
        setFailure(result.error.message);
      }
    } finally {
      setBusy(null);
    }
  }

  // The SDK resolves the minted action id from the part; without it the call cannot be made.
  const canApprove = Boolean(part.approveActionId);
  const canDeny = Boolean(part.denyActionId);

  return (
    <section className="approval" data-state={part.state} id={approvalDomId(part.approvalId)}>
      <span className="approval-rail" aria-hidden />

      <div className="approval-main">
        <header className="approval-head">
          <span className="approval-glyph" aria-hidden>
            <ShieldIcon />
          </span>
          <div className="approval-heading">
            <span className="approval-eyebrow">{copy.eyebrow}</span>
            <code className="approval-tool">{part.toolName}</code>
          </div>
          <span className="approval-chip">{copy.chip}</span>
        </header>

        <div className="approval-tags">
          {source ? <span className="approval-tag">{source}</span> : null}
          <span className="approval-tag approval-tag-muted">{part.approvalId}</span>
        </div>

        <div className="approval-args">
          <span className="approval-args-label">Arguments</span>
          {part.input ? <ArgList input={part.input} /> : <p className="approval-empty">No arguments sent.</p>}
        </div>

        {failure ? (
          <p className="approval-failure" role="alert">
            {failure}
          </p>
        ) : null}

        {isPending ? (
          <footer className="approval-actions">
            <button
              type="button"
              className="approval-btn approval-deny"
              onClick={() => respond('denied')}
              disabled={Boolean(busy) || !onRespond || !canDeny}
              title={canDeny ? undefined : 'Server did not mint a deny action id'}
            >
              {busy === 'denied' ? <span className="spinner spinner-dark" aria-hidden /> : <XIcon />}
              Deny
            </button>
            <button
              type="button"
              className="approval-btn approval-approve"
              onClick={() => respond('approved')}
              disabled={Boolean(busy) || !onRespond || !canApprove}
              title={canApprove ? undefined : 'Server did not mint an approve action id'}
            >
              {busy === 'approved' ? <span className="spinner" aria-hidden /> : <CheckIcon size={13} />}
              Approve
            </button>
          </footer>
        ) : (
          <footer className="approval-resolved">
            <span className="approval-resolved-glyph" aria-hidden>
              {part.state === 'approved' ? <CheckIcon size={12} /> : <XIcon size={11} />}
            </span>
            {part.state === 'approved' ? 'You approved this call' : 'You denied this call'}
          </footer>
        )}
      </div>
    </section>
  );
}
