'use client';

import { useOptimistic, useState, useTransition } from 'react';

import type { ContactCardResult } from './actions';

const SAVE_FAILED = 'Couldn’t save that. Try again.';

export type SavedSwitch = {
  /** What the switch shows: the change being saved, from the moment it's made. */
  shown: boolean;
  saving: boolean;
  /** Why the last change couldn't be saved; the switch went back. */
  error?: string;
  change: (next: boolean) => void;
  /** Takes a value the server saved by itself, as part of another change, before the page shows it. */
  reset: (value: boolean) => void;
};

/**
 * A switch whose change shows at once and is saved behind it. `value` is the page's: a save that worked counts until
 * the page catches up, and a new value from the page wins. When saving fails, the switch goes back, `error` says why,
 * and `onFail` hears it too.
 */
export function useSavedSwitch(
  value: boolean,
  save: (next: boolean) => Promise<ContactCardResult>,
  onFail?: (error: string) => void
): SavedSwitch {
  // What was saved last: the page's, or what a save answered before the page caught up.
  const [saved, setSaved] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setSaved(value);
  }
  const [shown, show] = useOptimistic(saved, (_: boolean, next: boolean) => next);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string>();

  function change(next: boolean) {
    setError(undefined);
    startSaving(async () => {
      show(next);
      const result = await save(next).catch((): ContactCardResult => ({ ok: false, error: SAVE_FAILED }));

      if (result.ok) {
        setSaved(next);
      } else {
        setError(result.error);
        onFail?.(result.error);
      }
    });
  }

  return { shown, saving, error, change, reset: setSaved };
}
