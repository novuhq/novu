'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ConnectCode, ConnectCodeResult } from '@/lib/host-status';
import { DEFAULT_HOST, type HostId, hostOf } from '@/lib/hosts';

/** A code on screen, with when it runs out by the browser's own clock. */
export type HeldCode = ConnectCode & { deadline: number };

export type ConnectCodeState =
  | { status: 'loading' }
  | { status: 'ready'; code: HeldCode }
  | { status: 'error'; error: string };

/** A code is swapped this long before it runs out, so the one on screen always has time to be used. */
const REFRESH_BEFORE_MS = 60_000;

/** Never sooner than this after the last one, should the clocks disagree about how long a code has left. */
const MIN_REFRESH_DELAY_MS = 5000;

const CODE_ERROR = 'We couldn’t get a code just now.';

/**
 * The one-time code a connect drawer shows. A fresh one is asked for every time `active` turns on, and
 * swapped for a new one shortly before it runs out for as long as it stays on. `renew` swaps it at once,
 * for a code the API says ran out or doesn't know (`useCodeWatch`): the one on screen stays until the new
 * one is there, which then fades in where it was. `retry` starts over after an error.
 */
export function useConnectCode(fetchCode: () => Promise<ConnectCodeResult>, active: boolean) {
  const [state, setState] = useState<ConnectCodeState>({ status: 'loading' });
  // Only the latest request counts: an answer that arrives after the drawer closed, or after a newer one, is dropped.
  const request = useRef(0);
  const latestFetch = useRef(fetchCode);

  useEffect(() => {
    latestFetch.current = fetchCode;
  });

  const load = useCallback(async (mode: 'fresh' | 'refresh') => {
    const id = ++request.current;
    // A code about to run out stays on screen until the new one is there: it still works for a minute.
    if (mode === 'fresh') {
      setState({ status: 'loading' });
    }

    const result = await latestFetch.current().catch((): ConnectCodeResult => ({ ok: false, error: CODE_ERROR }));
    if (id !== request.current) {
      return;
    }

    setState(result.ok ? { status: 'ready', code: hold(result) } : { status: 'error', error: result.error });
  }, []);

  useEffect(() => {
    if (!active) {
      request.current++;

      return;
    }

    void load('fresh');
  }, [active, load]);

  const deadline = state.status === 'ready' ? state.code.deadline : null;

  useEffect(() => {
    if (!active || deadline === null) {
      return;
    }

    const delay = Math.max(MIN_REFRESH_DELAY_MS, deadline - REFRESH_BEFORE_MS - Date.now());
    const timer = window.setTimeout(() => void load('refresh'), delay);

    return () => window.clearTimeout(timer);
  }, [active, deadline, load]);

  const renew = useCallback(() => void load('refresh'), [load]);
  const retry = useCallback(() => void load('fresh'), [load]);

  return { state, renew, retry };
}

/** What a host's commands show while their own code is on its way. */
const LOADING: ConnectCodeState = { status: 'loading' };

/**
 * The code for the host the picker shows (`useConnectCode`). Each host that runs commands gets a code of its
 * own, so the API knows which host used it. Choosing another one asks for its code afresh, and its commands
 * show none until that's there: a code only ever shows, and copies, next to the host it was made for. A chat
 * app needs no code, so choosing one keeps the last.
 */
export function useHostConnectCode(
  fetchCode: (host: HostId) => Promise<ConnectCodeResult>,
  selected: HostId,
  active: boolean
) {
  const runsCommands = hostOf(selected).group === 'commands';
  const [codeHost, setCodeHost] = useState<HostId>(runsCommands ? selected : DEFAULT_HOST);
  if (runsCommands && selected !== codeHost) {
    setCodeHost(selected);
  }

  // The host the code on screen, or on its way, was asked for.
  const [askedFor, setAskedFor] = useState<HostId | null>(null);
  const fetchForHost = useCallback(() => {
    setAskedFor(codeHost);

    return fetchCode(codeHost);
  }, [fetchCode, codeHost]);
  const { state, renew, retry } = useConnectCode(fetchForHost, active);

  useEffect(() => {
    if (active && askedFor !== null && askedFor !== codeHost) {
      retry();
    }
  }, [active, askedFor, codeHost, retry]);

  return { state: askedFor === codeHost ? state : LOADING, renew, retry };
}

function hold({ code, expiresInMs }: Extract<ConnectCodeResult, { ok: true }>): HeldCode {
  return { ...code, deadline: Date.now() + expiresInMs };
}
