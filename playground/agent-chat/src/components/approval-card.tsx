'use client';

import type { AgentMessage, UseAgentChatResult } from '@novu/react';
import { useState } from 'react';
import { CheckIcon, ChevronIcon, ShieldIcon, XIcon } from './icons';

export type RespondToAction = UseAgentChatResult['respondToAction'];
type AgentApprovalPart = Extract<AgentMessage['parts'][number], { type: 'approval' }>;

type Decision = 'approved' | 'denied';

const STATE_META: Record<AgentApprovalPart['state'], { label: string; tone: 'pending' | 'ok' | 'danger' }> = {
  pending: { label: 'Needs review', tone: 'pending' },
  approved: { label: 'Approved', tone: 'ok' },
  denied: { label: 'Denied', tone: 'danger' },
};

export function approvalDomId(approvalId: string): string {
  return `approval-${approvalId}`;
}

function sourceLabel(source: AgentApprovalPart['source']): string | undefined {
  if (!source) return undefined;

  return source.type === 'mcp' ? `MCP · ${source.serverName}` : source.type;
}

function ArgValue({ value }: { value: unknown }) {
  if (value === null || typeof value !== 'object') {
    return <span className="arg-scalar">{typeof value === 'string' ? value : JSON.stringify(value)}</span>;
  }

  return <pre className="arg-json">{JSON.stringify(value, null, 2)}</pre>;
}

function ArgList({ input }: { input: Record<string, unknown> }) {
  return (
    <dl className="arg-list">
      {Object.entries(input).map(([key, value]) => (
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
  onRespond?: RespondToAction;
};

export function ApprovalCard({ part, onRespond }: ApprovalCardProps) {
  const [busy, setBusy] = useState<Decision | null>(null);
  const [failure, setFailure] = useState<string>();

  const isPending = part.state === 'pending';
  const meta = STATE_META[part.state];
  const source = sourceLabel(part.source);
  const argumentCount = Object.keys(part.input ?? {}).length;
  const titleId = `${approvalDomId(part.approvalId)}-title`;

  async function respond(decision: Decision) {
    if (!onRespond || busy) return;

    setBusy(decision);
    setFailure(undefined);

    try {
      const result = await onRespond({ actionId: part.approvalId, decision });
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
    <section
      className="action-card"
      data-state={part.state}
      id={approvalDomId(part.approvalId)}
      aria-labelledby={titleId}
    >
      <header className="action-card-head">
        <span className="action-icon" aria-hidden>
          <ShieldIcon size={14} />
        </span>
        <div className="action-titles">
          <span className="action-kicker">{source ? `Tool approval · ${source}` : 'Tool approval'}</span>
          <h3 className="action-title" id={titleId}>
            <code>{part.toolName}</code>
          </h3>
        </div>
        <span className="action-status" data-tone={meta.tone}>
          {meta.label}
        </span>
      </header>

      {argumentCount > 0 ? (
        <details className="action-args" open={isPending}>
          <summary>
            <ChevronIcon className="action-args-chevron" />
            Arguments
            <span className="action-args-count">{argumentCount}</span>
          </summary>
          <div className="action-args-body">
            <ArgList input={part.input ?? {}} />
          </div>
        </details>
      ) : (
        <p className="action-empty">This tool takes no arguments.</p>
      )}

      {failure ? (
        <p className="action-failure" role="alert">
          {failure}
        </p>
      ) : null}

      <footer className="action-foot">
        <code className="action-id" title={part.approvalId}>
          {part.approvalId}
        </code>
        {isPending ? (
          <>
            <button
              type="button"
              className="action-btn action-btn-quiet"
              onClick={() => respond('denied')}
              disabled={Boolean(busy) || !onRespond || !canDeny}
              title={canDeny ? undefined : 'Server did not mint a deny action id'}
            >
              {busy === 'denied' ? <span className="spinner" aria-hidden /> : <XIcon size={11} />}
              Deny
            </button>
            <button
              type="button"
              className="action-btn action-btn-primary"
              onClick={() => respond('approved')}
              disabled={Boolean(busy) || !onRespond || !canApprove}
              title={canApprove ? undefined : 'Server did not mint an approve action id'}
            >
              {busy === 'approved' ? <span className="spinner" aria-hidden /> : <CheckIcon size={12} />}
              Approve
            </button>
          </>
        ) : (
          <span className="action-resolved">
            <span className="action-resolved-glyph" data-tone={meta.tone} aria-hidden>
              {part.state === 'approved' ? <CheckIcon size={11} /> : <XIcon size={10} />}
            </span>
            {part.state === 'approved' ? 'You approved this tool call' : 'You denied this tool call'}
          </span>
        )}
      </footer>
    </section>
  );
}
