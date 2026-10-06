'use client';

import { Check, Link2, UserPlus } from 'lucide-react';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  return (
    <Card glow className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded bg-raised text-foreground ring-1 ring-border-strong"
      >
        <UserPlus className="size-4" />
      </span>
      <div className="flex min-w-56 flex-1 flex-col gap-0.5">
        <h2 className="text-sm font-medium tracking-tight text-foreground">Invite someone through your agent</h2>
        <p className="text-sm tracking-tight text-secondary">
          Tell your agent &quot;invite Maya to Human&quot;, or run the command. You get a link to send them.
        </p>
      </div>
      <CopyField command value={INVITE_COMMAND} label="Copy invite command" className="min-w-0 max-w-full" />
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Link2 aria-hidden="true" className="size-3.5" />
        Create invite link
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Mounted per opening, so the form always starts empty. */}
        {open && <InviteDialogContent />}
      </Dialog>
    </Card>
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
        icon={
          <DialogMark tone="accent">
            <Check className="size-3.5" strokeWidth={3} />
          </DialogMark>
        }
        title="Invite link ready"
        description={`Send it to ${created.name} however you like. It works once and expires in 3 days.`}
        footer={
          <DialogClose asChild>
            <Button variant="secondary">Done</Button>
          </DialogClose>
        }
      >
        <CopyField value={created.url} label="Copy invite link" action="Copy" />
        <p className="text-xs tracking-tight text-muted">
          They choose Telegram or Slack when they open it. Their name shows up here once they join.
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
      description="Who are you inviting? They pick Telegram or Slack when they open the link."
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
          hint={
            <>
              Lowercase, no spaces. Your agent uses it, like <code className="font-mono">human ask --to john</code>.
            </>
          }
          error={fieldErrors.contactId}
        >
          {(field) => (
            <Input
              {...field}
              name="contactId"
              placeholder="john"
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
              className="font-mono"
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
          <p role="alert" className="text-sm tracking-tight text-danger">
            {error}
          </p>
        )}
      </form>
    </DialogContent>
  );
}
