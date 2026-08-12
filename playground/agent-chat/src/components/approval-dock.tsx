'use client';

import type { AgentPendingAction } from '@novu/react';
import { approvalDomId } from './approval-card';
import { ShieldIcon } from './icons';

export function ApprovalDock({ actions }: { actions: AgentPendingAction[] }) {
  const first = actions[0];

  if (!first) {
    return null;
  }

  const count = actions.length;

  function review() {
    const elementId =
      first.type === 'tool-approval' ? approvalDomId(first.approvalId) : `mcp-connection-${first.actionId}`;
    document.getElementById(elementId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <div className="approval-dock" role="status">
      <span className="approval-dock-glyph" aria-hidden>
        <ShieldIcon size={14} />
      </span>
      <span className="approval-dock-copy">
        <strong>{count === 1 ? '1 action' : `${count} actions`}</strong> waiting on you
        {count === 1 ? (
          <>
            {': '}
            <code>{first.type === 'tool-approval' ? first.toolName : first.displayName}</code>
          </>
        ) : null}
      </span>
      <button type="button" className="approval-dock-btn" onClick={review}>
        Review
      </button>
    </div>
  );
}
