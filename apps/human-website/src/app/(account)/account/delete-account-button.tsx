'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { deleteAccountAction } from './actions';

/** Asks once more before deleting, since the account can't be restored. */
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="text" onClick={() => setConfirming(true)}>
        Delete account
      </Button>
    );
  }

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction();
      setError(result.error);
    });
  };

  return (
    <div className="rounded-md p-4 ring-1 ring-accent/40">
      <p className="text-[15px] leading-[1.375] tracking-tight text-foreground/80">
        This deletes your Human account. Your agents can no longer reach anyone through it, and it can&apos;t be undone.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button pending={pending} onClick={handleDelete}>
          Yes, delete my account
        </Button>
        <Button variant="text" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm tracking-tight text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
