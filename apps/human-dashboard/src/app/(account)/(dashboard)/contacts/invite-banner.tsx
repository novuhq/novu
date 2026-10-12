'use client';

import { Link2, UserPlus } from 'lucide-react';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { CopyField } from '@/components/ui/copy-field';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';

import { createInviteAction } from './actions';
import { DialogMark } from './dialog-mark';
import { type InviteFieldErrors, parseInviteFields } from './invite-fields';

const INVITE_COMMAND = 'human invite john --name "John Doe"';

type CreatedInvite = { url: string; name: string };

/** The banner above the list: the two ways to invite someone, through the agent or with a link made here. */
export function InviteBanner() {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);

  function openDialog() {
    setOpening((count) => count + 1);
    setOpen(true);
  }

  return (
    <section className="dither-side dither-breathe flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-background px-5 py-4.5">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-raised text-foreground"
      >
        <UserPlus className="size-4.5" />
      </span>
      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <h2 className="text-[13px] leading-4.5 font-medium text-foreground">Invite someone through your agent</h2>
        <p className="text-xs leading-4 text-secondary">
          Tell your agent “invite Maya to Human”, or run the command. You get a link to send them.
        </p>
      </div>
      <CopyField command value={INVITE_COMMAND} label="Copy invite command" className="w-105 max-w-full" />
      <Button variant="secondary" className="h-9" onClick={openDialog}>
        <Link2 aria-hidden="true" className="size-4" />
        Create invite link
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* A new key per opening starts the form empty, and keeps what was shown in place while it closes. */}
        <InviteDialogContent key={opening} />
      </Dialog>
    </section>
  );
}

/** Asks who is being invited, then swaps to the link once it's made. */
function InviteDialogContent() {
  const formId = useId();
  const [contactId, setContactId] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [pending, startTransition] = useTransition();

  if (created) {
    return (
      <DialogContent
        icon={<DialogMark glyph="check" />}
        title="Invite link ready"
        description={`Send it to ${created.name} however you like. It expires in 3 days.`}
        footer={
          <DialogClose asChild>
            <Button variant="secondary">Done</Button>
          </DialogClose>
        }
      >
        <CopyField
          value={created.url}
          display={created.url.replace(/^https?:\/\//, '')}
          label="Copy invite link"
          action="Copy"
        />
        <p className="text-xs leading-4 text-muted">
          They choose Telegram, Slack or email when they open it. Their name shows up here once they join.
        </p>
      </DialogContent>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseInviteFields({ contactId, name });
    setFieldErrors(parsed.errors ?? {});
    if (parsed.errors) {
      return;
    }

    startTransition(async () => {
      const result = await createInviteAction({ contactId, name });

      if (result.ok) {
        setCreated({ url: result.url, name: name.trim().replace(/\s+/g, ' ') });
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setError(result.error ?? null);
      }
    });
  }

  return (
    <DialogContent
      title="Invite someone"
      locked={pending}
      description="Who are you inviting? They pick Telegram, Slack or email when they open the link."
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} pending={pending}>
            Create invite link
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="ID"
          required
          hint="Lowercase, no spaces. Your agent uses it, like human ask --to john."
          error={fieldErrors.contactId}
        >
          {(field) => (
            <Input
              {...field}
              name="contactId"
              placeholder="john"
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={128}
              required
            />
          )}
        </Field>
        <Field label="Full name" required hint="Shown in Contacts and in the invite." error={fieldErrors.name}>
          {(field) => (
            <Input
              {...field}
              name="name"
              placeholder="John Doe"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              maxLength={128}
              required
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-xs leading-4 text-danger">
            {error}
          </p>
        )}
      </form>
    </DialogContent>
  );
}
