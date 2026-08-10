'use client';

import type { AgentApprovalPart } from '@novu/react';
import { useCallback, useEffect, useRef } from 'react';
import { emitDebugEvent } from './debug-events';

/**
 * One-time reaction to an approval request.
 *
 * `pendingApprovals` already drives the card and the dock, so this covers only what a
 * derived list cannot: telling you while the tab is in the background. The hook fires
 * `onApprovalRequested` once per approval id, so no dedupe is needed here.
 */
export function useApprovalAlert(): (approval: AgentApprovalPart) => void {
  const baseTitleRef = useRef('');
  const missedRef = useRef(0);

  useEffect(() => {
    baseTitleRef.current = document.title;

    function restore() {
      if (document.visibilityState !== 'visible') return;

      missedRef.current = 0;
      document.title = baseTitleRef.current;
    }

    document.addEventListener('visibilitychange', restore);

    return () => {
      document.removeEventListener('visibilitychange', restore);
      document.title = baseTitleRef.current;
    };
  }, []);

  return useCallback((approval: AgentApprovalPart) => {
    emitDebugEvent({
      source: 'sdk',
      name: `onApprovalRequested ${approval.toolName}`,
      payload: { approvalId: approval.approvalId, toolName: approval.toolName, state: approval.state },
    });

    if (document.visibilityState === 'visible') return;

    missedRef.current += 1;
    document.title = `(${missedRef.current}) Approval needed — ${approval.toolName}`;

    // Permission is never requested on load: grant it manually to exercise this path.
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Approval needed', {
        body: approval.toolName,
        tag: approval.approvalId,
      });
    }
  }, []);
}
