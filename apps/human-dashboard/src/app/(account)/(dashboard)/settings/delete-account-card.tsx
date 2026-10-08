'use client';

import { useState, useTransition } from 'react';

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
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      // Only comes back when it failed: a deleted account leaves the dashboard.
      const result = await deleteAccountAction();
      setError(result.error);
    });
  }

  return (
    <DialogContent
      className="max-w-115"
      headerClassName={DIALOG_HEADER}
      icon={<DialogMark glyph="warning" />}
      title="Delete your account?"
      locked={pending}
      description={`This deletes your Human account and ${agentName} with its channels, contacts and API key. Agents using the key can no longer reach anyone, and it can't be undone.`}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" pending={pending} onClick={handleDelete}>
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
