'use client';

import { Link2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import type { Contact } from '@/lib/human-contacts-api';

import { removeContactAction } from './actions';
import { ChannelIcon } from './channel-icon';
import { DialogMark } from './dialog-mark';
import { ShortDate } from './short-date';

const COLUMN_COUNT = 6;

/** Shown on hover of the row, and whenever the keyboard lands on it. */
const ROW_COPY_CLASS_NAME = 'size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100';

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
  const [removing, setRemoving] = useState<Contact | null>(null);

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Person</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Channels</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Added</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {contacts.length === 0 && (
            <tr>
              <TableCell colSpan={COLUMN_COUNT} className="text-center text-secondary">
                No contacts here yet.
              </TableCell>
            </tr>
          )}
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              isOperator={contact.id === operatorContactId}
              onRemove={() => setRemoving(contact)}
            />
          ))}
        </TableBody>
        <tfoot className="border-t border-border">
          <tr>
            <td colSpan={COLUMN_COUNT} className="px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] tracking-wider text-muted uppercase">{rangeLabel}</span>
                <div className="flex items-center gap-2">
                  <PagerLink href={previousHref}>Previous</PagerLink>
                  <PagerLink href={nextHref}>Next</PagerLink>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </Table>
      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        {removing && (
          <RemoveDialogContent contact={removing} agentName={agentName} onRemoved={() => setRemoving(null)} />
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
      <TableCell>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium text-secondary uppercase"
          >
            {pending ? <Link2 className="size-3.5" /> : contact.name.charAt(0)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{contact.name}</span>
              {isOperator && <Badge>You</Badge>}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-muted">
              <span className="truncate">{contact.id}</span>
              {pending && <PendingNote contact={contact} />}
              <CopyButton value={contact.id} label={`Copy ${contact.name}'s ID`} className={ROW_COPY_CLASS_NAME} />
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {contact.email && (
          <span className="flex items-center gap-1 font-mono text-xs text-secondary">
            <span className="truncate">{contact.email}</span>
            <CopyButton value={contact.email} label={`Copy ${contact.name}'s email`} className={ROW_COPY_CLASS_NAME} />
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {contact.channels.map((channel) => (
            <ChannelIcon key={channel.via} via={channel.via} />
          ))}
        </div>
      </TableCell>
      <TableCell>
        {pending ? <Badge variant="pending">Invite sent</Badge> : <Badge variant="success">Joined</Badge>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-secondary">
        <ShortDate iso={contact.createdAt} todayLabel="Today" />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {pending && contact.invite?.url && (
            <CopyButton value={contact.invite.url} label={`Copy ${contact.name}'s invite link`}>
              Copy link
            </CopyButton>
          )}
          {!isOperator && (
            <Tooltip label="Remove">
              <Button variant="ghost" aria-label={`Remove ${contact.name}`} onClick={onRemove}>
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
      <Button variant="secondary" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Link href={href} className={buttonClassName('secondary')}>
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
      icon={
        <DialogMark tone="danger">
          <span className="text-sm leading-none font-semibold">!</span>
        </DialogMark>
      }
      title={`Remove ${contact.name}?`}
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
        <p role="alert" className="text-sm tracking-tight text-danger">
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
