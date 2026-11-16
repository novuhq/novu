'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { describeWhatsAppWindow, describeWhatsAppWindowWithoutTime, type WhatsAppWindow } from '@/lib/whatsapp-window';

const subscribeToNothing = () => () => {};

/** setTimeout can't wait longer than this; a window further off than ~24 days is checked again then. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * A WhatsApp window in words, for the contacts table and card.
 * - **Before the page is live:** the server doesn't know the operator's time zone, so it renders the same words
 *   without a time, and the browser swaps in the local closing time once it runs, the way `ShortDate` does.
 * - **When the window shuts:** the words change at that moment, without waiting for something else to render.
 */
export function useWhatsAppWindow(window: WhatsAppWindow | undefined) {
  const inBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const closesAt = window?.closesAt;
  const [, setTick] = useState(0);

  useEffect(() => {
    const left = closesAt ? Date.parse(closesAt) - Date.now() : Number.NaN;
    if (!Number.isFinite(left) || left <= 0) {
      return;
    }

    const timer = setTimeout(() => setTick((tick) => tick + 1), Math.min(left + 250, MAX_TIMEOUT_MS));

    return () => clearTimeout(timer);
  }, [closesAt]);

  if (!window) {
    return undefined;
  }

  return inBrowser ? describeWhatsAppWindow(window) : describeWhatsAppWindowWithoutTime(window);
}
