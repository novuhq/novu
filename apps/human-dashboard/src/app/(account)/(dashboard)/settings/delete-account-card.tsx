'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

import { DialogMark } from '../contacts/dialog-mark';
import { deleteAccountAction } from './actions';
import { DIALOG_HEADER } from './api-key-card';
import { CardHeading, SettingsCard } from './settings-card';

type DeleteAccountCardProps = {
  /** How the operator's agent is called in a sentence: its own name, or "Human assistant". */
  agentName: string;
};

/** The last card of Settings. Asks once more before deleting, since the account can't be restored. */
export function DeleteAccountCard({ agentName }: DeleteAccountCardProps) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);

  function openDialog() {
    setOpening((count) => count + 1);
    setOpen(true);
  }

  return (
    <SettingsCard className="flex flex-wrap items-center gap-x-3 gap-y-3 py-4">
      <CardHeading
        muted
        title="Delete account"
        description={`Deletes ${agentName} with its channels, contacts and API key. This can't be undone.`}
      />
      <Button variant="secondary" onClick={openDialog}>
        Delete account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* A new key per opening forgets an earlier error, and keeps what was shown in place while it closes. */}
        <DeleteDialogContent key={opening} agentName={agentName} />
      </Dialog>
    </SettingsCard>
  );
}

function DeleteDialogContent({ agentName }: DeleteAccountCardProps) {
  const [error, setError] = useState<string | null>(null);
  // Stays true once the account is gone, so the dialog keeps busy until the browser has left.
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setError(null);
    setBusy(true);

    const result = await deleteAccountAction().catch(() => ({
      ok: false as const,
      error: 'Something went wrong while deleting your account. Please try again.',
    }));
    if (!result.ok) {
      setError(result.error);
      setBusy(false);

      return;
    }

    // A full page load, not a move inside the app: this page belongs to a user that no longer exists, and
    // rendering it again (which signing out through Clerk does) has nobody to show. Clerk drops what is
    // left of the session when it loads on the next page.
    window.location.assign('/');
  }

  return (
    <DialogContent
      className="max-w-115"
      headerClassName={DIALOG_HEADER}
      icon={<DialogMark glyph="warning" />}
      title="Delete your account?"
      locked={busy}
      description={`This deletes your Human account and ${agentName} with its channels, contacts and API key. Agents using the key can no longer reach anyone, and it can't be undone.`}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" pending={busy} onClick={handleDelete}>
            Delete account
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-xs leading-4 text-danger">
          {error}
        </p>
      )}
    </DialogContent>
  );
}
