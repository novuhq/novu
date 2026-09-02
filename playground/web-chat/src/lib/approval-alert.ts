'use client';

import type { AgentPendingAction } from '@novu/react';
import { useCallback, useEffect, useRef } from 'react';
import { emitDebugEvent } from './debug-events';

/**
 * One-time reaction to a pending action.
 *
 * `pendingActions` already drives in-thread approval UI, so this covers only what a
 * derived list cannot: telling you while the tab is in the background. The hook fires
 * `onActionRequested` once per action id, so no dedupe is needed here.
 */
export function useApprovalAlert(): (action: AgentPendingAction) => void {
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

  return useCallback((action: AgentPendingAction) => {
    const label = action.type === 'tool-approval' ? action.toolName : action.displayName;
    emitDebugEvent({
      source: 'sdk',
      name: `onActionRequested ${label}`,
      payload: { actionId: action.id, type: action.type },
    });

    if (document.visibilityState === 'visible') return;

    missedRef.current += 1;
    document.title = `(${missedRef.current}) Action needed - ${label}`;

    // Permission is never requested on load: grant it manually to exercise this path.
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Action needed', {
        body: label,
        tag: action.id,
      });
    }
  }, []);
}
