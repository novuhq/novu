'use client';

import { useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'pending' | 'success' | 'error';

export function useClipboard(text: string) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  const pending = useRef(false);
  useEffect(
    () => () => {
      request.current += 1;
      pending.current = false;
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  async function copy() {
    if (pending.current) return;
    pending.current = true;
    const current = ++request.current;
    if (timer.current) clearTimeout(timer.current);
    setState('pending');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (current !== request.current) return;
      setState('success');
      timer.current = setTimeout(() => setState('idle'), 2000);
    } catch {
      if (current === request.current) setState('error');
    } finally {
      if (current === request.current) pending.current = false;
    }
  }
  return { state, copy };
}
