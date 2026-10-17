'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getInviteStatus, type InviteStatus } from '@/lib/invite-api';

const POLL_INTERVAL_MS = 3_000;

export type InviteStatusState = { phase: 'loading' } | { phase: 'failed' } | { phase: 'ready'; status: InviteStatus };

/**
 * Loads the invite and keeps it fresh while the link is usable: every few seconds, and as
 * soon as the person comes back to this tab from Telegram or Slack. A failed refresh keeps
 * the last good status on screen; only a failed first load shows up as `failed`.
 */
export function useInviteStatus(apiUrl: string, token: string) {
  const [state, setState] = useState<InviteStatusState>({ phase: 'loading' });
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const status = await getInviteStatus(apiUrl, token, controller.signal);

      if (!controller.signal.aborted) {
        setState({ phase: 'ready', status });
      }
    } catch {
      if (!controller.signal.aborted) {
        setState((previous) => (previous.phase === 'ready' ? previous : { phase: 'failed' }));
      }
    }
  }, [apiUrl, token]);

  useEffect(() => {
    void refresh();

    return () => inFlight.current?.abort();
  }, [refresh]);

  const isActive = state.phase === 'ready' && state.status.valid;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    const interval = window.setInterval(refreshWhenVisible, POLL_INTERVAL_MS);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [isActive, refresh]);

  return { state, refresh };
}
