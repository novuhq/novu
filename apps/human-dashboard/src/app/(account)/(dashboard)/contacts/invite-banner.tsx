'use client';

import { Link as LinkIcon, UserPlus } from 'lucide-react';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { FOCUSED_INPUT } from '@/components/channels/setup-parts';
import { Button } from '@/components/ui/button';
import { CopyField } from '@/components/ui/copy-field';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { Fold } from '@/components/ui/stepper';
import { useSwap } from '@/hooks/use-swap';
import { cn } from '@/lib/utils';
import { createInviteAction } from './actions';
import { DialogMark } from './dialog-mark';
import { type InviteFieldErrors, parseInviteFields } from './invite-fields';

/**
 * The CLI's way of doing what the card does (`$ inbox invite` in the design). It is written as the CLI
 * really takes it, so a copy runs.
 */
export const INVITE_COMMAND = 'agentinbox contact invite john';

/** How long the form takes to fade before the link takes its place. */
const SWAP_MS = 150;

/** The design's input in this dialog: the default border, the orange one with its inner ring on focus. */
const INPUT_CLASS_NAME = cn(FOCUSED_INPUT, 'ring-border');

/** An input with an error: the red border with a red ring inside, as the design's `Input` has it. */
const INVALID_INPUT_CLASS_NAME =
  'shadow-[inset_0_0_0_3px_rgb(251_55_72/0.22)] focus-visible:shadow-[inset_0_0_0_3px_rgb(251_55_72/0.22)]';

type CreatedInvite = { url: string; name: string };

/** Where the dialog stands when it opens: a form already filled in, an error, or the link made. */
export type InviteDialogStart = {
  contactId?: string;
  name?: string;
  fieldErrors?: InviteFieldErrors;
  error?: string;
  created?: CreatedInvite;
};

type InviteBannerProps = {
  /** Opens the dialog with the page, standing where this says. */
  start?: InviteDialogStart;
};

/** The card above the list: the two ways to invite someone, through the agent or with a link made here. */
export function InviteBanner({ start }: InviteBannerProps) {
  const [open, setOpen] = useState(Boolean(start));
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
          Tell your agent “invite Maya to my inbox”, or run the command. You get a link to send them.
        </p>
      </div>
      <CopyField command value={INVITE_COMMAND} label="Copy invite command" className="w-105 max-w-full" />
      <Button variant="secondary" onClick={openDialog}>
        <LinkIcon aria-hidden="true" className="size-4" />
        Create invite link
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* A new key per opening starts the form empty, and keeps what was shown in place while it closes. */}
        <InviteDialogContent key={opening} start={opening === 0 ? start : undefined} />
      </Dialog>
    </section>
  );
}

/**
 * `5.2 · Create invite`, then `5.3 · Invite link ready`: asks who is being invited, and once the link is
 * made the form fades and the link fades in, the dialog growing to its new height.
 */
function InviteDialogContent({ start }: { start?: InviteDialogStart }) {
  const formId = useId();
  const [contactId, setContactId] = useState(start?.contactId ?? '');
  const [name, setName] = useState(start?.name ?? '');
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>(start?.fieldErrors ?? {});
  const [error, setError] = useState<string | null>(start?.error ?? null);
  const [created, setCreated] = useState<CreatedInvite | null>(start?.created ?? null);
  const [pending, startTransition] = useTransition();
  const { shown, leaving } = useSwap(created ? 'ready' : 'form', SWAP_MS);

  if (shown === 'ready' && created) {
    return (
      <DialogContent
        icon={<DialogMark glyph="check" />}
        title="Invite link ready"
        headerClassName="gap-2.5"
        description={`Send it to ${created.name} however you like. It expires in 3 days.`}
        footer={
          <DialogClose asChild>
            <Button variant="secondary">Done</Button>
          </DialogClose>
        }
      >
        <CopyField
          value={created.url}
          display={<span className="text-foreground">{created.url.replace(/^https?:\/\//, '')}</span>}
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
      headerClassName="gap-2.5"
      locked={pending || leaving}
      leaving={leaving}
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
          requiredMark="plain"
          hint="Lowercase, no spaces. Your agent uses it, like agentinbox inbox send Hello --to john."
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
              className={field.invalid ? INVALID_INPUT_CLASS_NAME : INPUT_CLASS_NAME}
            />
          )}
        </Field>
        <Field
          label="Full name"
          required
          requiredMark="plain"
          hint="Shown in Contacts and in the invite."
          error={fieldErrors.name}
        >
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
              className={field.invalid ? INVALID_INPUT_CLASS_NAME : INPUT_CLASS_NAME}
            />
          )}
        </Field>
        {/* It unfolds into place; going away, the dialog's own height eases back. */}
        {error && (
          <Fold open appear>
            <p role="alert" className="text-xs leading-4 text-danger">
              {error}
            </p>
          </Fold>
        )}
      </form>
    </DialogContent>
  );
}
