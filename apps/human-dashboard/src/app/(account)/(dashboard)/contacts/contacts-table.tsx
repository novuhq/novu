'use client';

import { Link2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import type { Contact } from '@/lib/human-contacts-api';
import { cn } from '@/lib/utils';

import { removeContactAction } from './actions';
import { ChannelIcon } from './channel-icon';
import { DialogMark } from './dialog-mark';
import { ShortDate } from './short-date';

const COLUMN_COUNT = 6;

/** The small copy icon after an id or an email. It fades in on hover of the row, and whenever the keyboard lands on it. */
const ROW_COPY_CLASS_NAME =
  'size-4 rounded-sm text-muted opacity-0 transition-[opacity,color] duration-200 ease-out hover:bg-transparent group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none';

/** Rows are 64px tall here. */
const CELL_CLASS_NAME = 'h-16';

type ContactsTableProps = {
  contacts: Contact[];
  /** The operator's own contact: it gets the "You" tag and can't be removed. */
  operatorContactId: string | null;
  /** Mid-sentence form, such as "your agent". */
  agentName: string;
  /** What the footer says about this page: "1–3 of 3". */
  rangeLabel: string;
  /** Where the pager goes; `null` when there's no such page. */
  previousHref: string | null;
  nextHref: string | null;
};

export function ContactsTable({
  contacts,
  operatorContactId,
  agentName,
  rangeLabel,
  previousHref,
  nextHref,
}: ContactsTableProps) {
  const [removing, setRemoving] = useState<{ contact: Contact; opening: number } | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  function askToRemove(contact: Contact) {
    setRemoving((previous) => ({ contact, opening: (previous?.opening ?? 0) + 1 }));
    setRemoveOpen(true);
  }

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell className="w-73">Person</TableHeaderCell>
            <TableHeaderCell className="w-50">Email</TableHeaderCell>
            <TableHeaderCell className="w-60">Channels</TableHeaderCell>
            <TableHeaderCell className="w-35">Status</TableHeaderCell>
            <TableHeaderCell>Added</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {contacts.length === 0 && (
            <tr>
              <TableCell
                colSpan={COLUMN_COUNT}
                className={cn(CELL_CLASS_NAME, 'text-center text-[13px] text-secondary')}
              >
                No contacts here yet.
              </TableCell>
            </tr>
          )}
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              isOperator={contact.id === operatorContactId}
              onRemove={() => askToRemove(contact)}
            />
          ))}
        </TableBody>
        <tfoot className="border-t border-border">
          <tr>
            <td colSpan={COLUMN_COUNT} className="h-12 px-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] leading-4 font-medium tracking-[0.06em] text-muted uppercase">
                  {rangeLabel}
                </span>
                <div className="flex items-center gap-2">
                  <PagerLink href={previousHref}>Previous</PagerLink>
                  <PagerLink href={nextHref}>Next</PagerLink>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </Table>
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        {/* The contact stays after closing, so the dialog keeps its text while it fades out. */}
        {removing && (
          <RemoveDialogContent
            key={removing.opening}
            contact={removing.contact}
            agentName={agentName}
            onRemoved={() => setRemoveOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

type ContactRowProps = { contact: Contact; isOperator: boolean; onRemove: () => void };

function ContactRow({ contact, isOperator, onRemove }: ContactRowProps) {
  const pending = contact.status === 'invite_sent';

  return (
    <TableRow className="group">
      <TableCell className={CELL_CLASS_NAME}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center border border-border bg-raised text-[13px] leading-4.5 font-medium text-secondary uppercase',
              pending ? 'rounded-lg' : 'rounded-full'
            )}
          >
            {pending ? <Link2 className="size-4" /> : contact.name.charAt(0)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13px] leading-4.5 font-medium">{contact.name}</span>
              {isOperator && <Badge>You</Badge>}
            </span>
            <span className="flex items-center gap-1 text-[11px] leading-4 text-muted">
              <span className="truncate font-mono">{contact.id}</span>
              {pending && <PendingNote contact={contact} />}
              <CopyButton
                value={contact.id}
                label={`Copy ${contact.name}'s ID`}
                className={ROW_COPY_CLASS_NAME}
                iconClassName="size-2.5"
              />
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className={CELL_CLASS_NAME}>
        {contact.email && (
          <span className="flex items-center gap-1 font-mono text-[11px] leading-4 text-muted">
            <span className="truncate">{contact.email}</span>
            <CopyButton
              value={contact.email}
              label={`Copy ${contact.name}'s email`}
              className={ROW_COPY_CLASS_NAME}
              iconClassName="size-2.5"
            />
          </span>
        )}
      </TableCell>
      <TableCell className={CELL_CLASS_NAME}>
        <div className="flex items-center gap-1.5">
          {contact.channels.map((channel) => (
            <ChannelIcon key={channel.via} via={channel.via} />
          ))}
        </div>
      </TableCell>
      <TableCell className={CELL_CLASS_NAME}>
        {pending ? (
          // Someone without a channel isn't always invited: their link may have expired, or they were added
          // from the CLI without one.
          <Badge variant="pending">{contact.invite ? 'Invite sent' : 'Not joined'}</Badge>
        ) : (
          <Badge variant="success">Joined</Badge>
        )}
      </TableCell>
      <TableCell className={cn(CELL_CLASS_NAME, 'text-[13px] leading-4.5 whitespace-nowrap text-secondary')}>
        <ShortDate iso={contact.createdAt} todayLabel="Today" />
      </TableCell>
      <TableCell className={CELL_CLASS_NAME}>
        <div className="flex items-center justify-end gap-1">
          {pending && contact.invite?.url && (
            <CopyButton
              value={contact.invite.url}
              label={`Copy ${contact.name}'s invite link`}
              className={SMALL_BUTTON}
            >
              Copy link
            </CopyButton>
          )}
          {!isOperator && (
            <Tooltip label="Remove">
              <Button
                variant="ghost"
                className="text-foreground"
                aria-label={`Remove ${contact.name}`}
                onClick={onRemove}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** "· pending, expires Oct 9" after the id of someone who hasn't joined yet. */
function PendingNote({ contact }: { contact: Contact }) {
  return (
    <span className="whitespace-nowrap">
      {'· '}
      {contact.invite ? (
        <>
          pending, expires <ShortDate iso={contact.invite.expiresAt} todayLabel="today" />
        </>
      ) : (
        // The link expired or was declined, or there never was one (they were added from the CLI).
        'pending, no active invite link'
      )}
    </span>
  );
}

function PagerLink({ href, children }: { href: string | null; children: string }) {
  if (!href) {
    return (
      <Button variant="secondary" className={SMALL_BUTTON} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Link href={href} className={buttonClassName('secondary', SMALL_BUTTON)}>
      {children}
    </Link>
  );
}

type RemoveDialogContentProps = { contact: Contact; agentName: string; onRemoved: () => void };

function RemoveDialogContent({ contact, agentName, onRemoved }: RemoveDialogContentProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeContactAction(contact.id);

      if (!result.ok) {
        setError(result.error);

        return;
      }

      toast(describeRemoval(contact.name, result.canceledInteractions));
      onRemoved();
    });
  }

  return (
    <DialogContent
      icon={<DialogMark glyph="warning" />}
      title={`Remove ${contact.name}?`}
      locked={pending}
      description={`${capitalize(agentName)} won't be able to ask them anything. Open questions to them are cancelled.`}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" pending={pending} onClick={handleRemove}>
            Remove
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

function describeRemoval(name: string, canceledInteractions: number): string {
  if (canceledInteractions === 0) {
    return `${name} was removed.`;
  }

  return `${name} was removed. ${canceledInteractions === 1 ? '1 open question was' : `${canceledInteractions} open questions were`} cancelled.`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
