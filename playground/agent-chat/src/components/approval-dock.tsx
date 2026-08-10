'use client';

import type { AgentApprovalPart } from '@novu/react';
import { approvalDomId } from './approval-card';
import { ShieldIcon } from './icons';

export function ApprovalDock({ approvals }: { approvals: AgentApprovalPart[] }) {
  const first = approvals[0];

  if (!first) {
    return null;
  }

  const count = approvals.length;

  function review() {
    document.getElementById(approvalDomId(first.approvalId))?.scrollIntoView({
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
        <strong>{count === 1 ? '1 approval' : `${count} approvals`}</strong> waiting on you
        {count === 1 ? (
          <>
            {' · '}
            <code>{first.toolName}</code>
          </>
        ) : null}
      </span>
      <button type="button" className="approval-dock-btn" onClick={review}>
        Review
      </button>
    </div>
  );
}
