'use client';

import { Link as LinkIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode, useEffect, useRef, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Fold } from '@/components/ui/stepper';
import { Table, TableBody, TableHead, TableHeaderCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import type { Contact, ContactChannelVia } from '@/lib/human-contacts-api';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '../configure/channel-logo';
import { removeContactAction } from './actions';
import { ContactAvatar } from './contact-avatar';
import { ContactCardDrawer, type ContactCardSetup, type ContactCardStart } from './contact-card-drawer';
import { DialogMark } from './dialog-mark';
import { ShortDate } from './short-date';

const COLUMN_COUNT = 6;

/** How long a removed row takes to fold away before the list is read again. */
const FOLD_MS = 300;

export const CHANNEL_NAMES: Record<ContactChannelVia, string> = {
  telegram: 'Telegram',
  slack: 'Slack',
  email: 'Email',
};

/**
 * The design's columns: Person 276, Email 200, Channels 240, Status 140, Added 100 and the actions 130,
 * with the row's 16px on the outer two.
 */
const COLUMNS = {
  person: 'w-73 pl-4',
  email: 'w-50',
  channels: 'w-60',
  status: 'w-35',
  added: 'w-25',
  actions: 'w-36.5 pr-4',
};

/**
 * The small copy icon after an id or an email. It fades in on hover of the row, and whenever the keyboard
 * lands on it.
 */
const ROW_COPY_CLASS_NAME =
  'size-4 rounded-sm text-muted opacity-0 transition-[opacity,color] duration-200 ease-out hover:bg-transparent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none';

type ContactsTableProps = {
  contacts: Contact[];
  /** The page of the list on show, so a new page swaps in as a whole instead of row by row. */
  pageKey: string;
  /** How the agent is called in a sentence: its address without the domain. */
  agentHandle: string;
  /** What the footer says about this page: "1–3 of 3". */
  rangeLabel: string;
  /** Where the pager goes; `null` when there's no such page. */
  previousHref: string | null;
  nextHref: string | null;
  /** What the contact card needs besides the operator's row. */
  card: ContactCardSetup;
  /** How the operator's contact card opens, for a link or the preview that opens it right away. */
  cardStart?: ContactCardStart;
};

/**
 * The people the agent can message (`5.1 · Contacts`). The row of the operator, or of anyone who joined,
 * opens their contact card; a new row unfolds into its place and a removed one folds away.
 */
export function ContactsTable({
  contacts,
  pageKey,
  agentHandle,
  rangeLabel,
  previousHref,
  nextHref,
  card,
  cardStart,
}: ContactsTableProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState<{ contact: Contact; opening: number } | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  // A removed row stays folded only until the refreshed list leaves it out: the same id can be invited again.
  const [listed, setListed] = useState(contacts);
  if (contacts !== listed) {
    setListed(contacts);
    const ids = new Set(contacts.map((contact) => contact.id));
    setLeaving((previous) => new Set([...previous].filter((id) => ids.has(id))));
  }
  const [cardOpen, setCardOpen] = useState(Boolean(cardStart));
  // Whose card opens: the operator's, unless a row of someone who joined was picked.
  const [cardContactId, setCardContactId] = useState<string | null>(null);
  const appearing = useAppearingRows(contacts, pageKey);
  // The first page shows up with the page; any other one fades in when the pager brings it.
  const [firstPageKey] = useState(pageKey);
  const operator = contacts.find((contact) => contact.isOperator) ?? null;
  const cardContact = cardContactId ? (contacts.find((contact) => contact.id === cardContactId) ?? null) : operator;

  function openCard(contact: Contact) {
    setCardContactId(contact.id);
    setCardOpen(true);
  }

  function askToRemove(contact: Contact) {
    setRemoving((previous) => ({ contact, opening: (previous?.opening ?? 0) + 1 }));
    setRemoveOpen(true);
  }

  // The row folds away first; the list is read again once it has, so nothing jumps. A card open on the
  // person removed from it closes along with the dialog.
  function foldAway(contactId: string) {
    setRemoveOpen(false);
    if (cardContactId === contactId) {
      setCardOpen(false);
    }
    setLeaving((previous) => new Set(previous).add(contactId));
    setTimeout(() => router.refresh(), FOLD_MS);
  }

  return (
    <>
      <Table className="table-fixed tracking-normal">
        <TableHead>
          <tr>
            <TableHeaderCell className={COLUMNS.person}>Person</TableHeaderCell>
            <TableHeaderCell className={cn(COLUMNS.email, 'px-0')}>Email</TableHeaderCell>
            <TableHeaderCell className={cn(COLUMNS.channels, 'px-0')}>Channels</TableHeaderCell>
            <TableHeaderCell className={cn(COLUMNS.status, 'px-0')}>Status</TableHeaderCell>
            <TableHeaderCell className={cn(COLUMNS.added, 'px-0')}>Added</TableHeaderCell>
            <TableHeaderCell className={cn(COLUMNS.actions, 'pl-0')}>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody
          key={pageKey}
          className={cn(pageKey !== firstPageKey && 'animate-overlay-in motion-reduce:animate-none')}
        >
          {contacts.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="h-16 px-4 text-center text-[13px] leading-4.5 text-secondary">
                No contacts here yet.
              </td>
            </tr>
          )}
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              appearing={appearing.has(contact.id)}
              leaving={leaving.has(contact.id)}
              onOpenCard={() => openCard(contact)}
              onRemove={() => askToRemove(contact)}
            />
          ))}
        </TableBody>
        <tfoot className="border-t border-border">
          <tr>
            <td colSpan={COLUMN_COUNT} className="py-2.5 pr-3 pl-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] leading-4 font-medium tracking-[0.06em] text-muted uppercase">
                  {rangeLabel}
                </span>
                <div className="flex items-center gap-1.5">
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
            agentHandle={agentHandle}
            onRemoved={() => foldAway(removing.contact.id)}
          />
        )}
      </Dialog>
      <ContactCardDrawer
        contact={cardContact}
        agentHandle={agentHandle}
        setup={card}
        start={cardContact?.isOperator ? cardStart : undefined}
        open={cardOpen && cardContact !== null}
        onOpenChange={setCardOpen}
        // The same dialog as the row's bin, over the card; cancelling it leaves the card open.
        onRemove={askToRemove}
      />
    </>
  );
}

/**
 * The rows that weren't on the page a moment ago, such as the invite just made: they unfold into their
 * place. Nothing appears on the first render, nor when the pager brings a whole new page.
 */
function useAppearingRows(contacts: Contact[], pageKey: string): ReadonlySet<string> {
  const seen = useRef<{ pageKey: string; ids: Set<string> } | null>(null);
  const previous = seen.current;
  const appearing = new Set(
    previous?.pageKey === pageKey
      ? contacts.filter((contact) => !previous.ids.has(contact.id)).map((contact) => contact.id)
      : []
  );

  useEffect(() => {
    seen.current = { pageKey, ids: new Set(contacts.map((contact) => contact.id)) };
  }, [contacts, pageKey]);

  return appearing;
}

type ContactRowProps = {
  contact: Contact;
  appearing: boolean;
  leaving: boolean;
  onOpenCard: () => void;
  onRemove: () => void;
};

function ContactRow({ contact, appearing, leaving, onOpenCard, onRemove }: ContactRowProps) {
  const pending = contact.status === 'invite_sent';
  const { isOperator } = contact;
  // Someone still invited has no card yet: there's no way to reach them to show.
  const hasCard = isOperator || !pending;

  // The whole row opens the card; its buttons keep doing their own thing.
  function openFromRow(event: MouseEvent<HTMLTableRowElement>) {
    if (!(event.target as HTMLElement).closest('button, a')) {
      onOpenCard();
    }
  }

  const cell = (column: string, children: ReactNode, className?: string) => (
    <td className={cn('p-0 align-middle', column)}>
      {/* 6px of room on the sides, so a focus ring isn't clipped while the row can fold. */}
      <Fold open={!leaving} appear={appearing} innerClassName="-mx-1.5 px-1.5">
        <div className={cn('flex h-16 items-center', className)}>{children}</div>
      </Fold>
    </td>
  );

  return (
    <tr
      onClick={hasCard ? openFromRow : undefined}
      className={cn(
        'group transition-colors duration-200 ease-out hover:bg-raised motion-reduce:transition-none',
        hasCard && 'cursor-pointer'
      )}
    >
      {cell(
        COLUMNS.person,
        <>
          {pending ? (
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-[7px] border border-border bg-raised text-foreground"
            >
              <LinkIcon className="size-4" />
            </span>
          ) : (
            <ContactAvatar seed={contact.id} className="size-8" />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-2">
              {hasCard ? (
                <button
                  type="button"
                  onClick={onOpenCard}
                  aria-label={isOperator ? `${contact.name}, your contact card` : `${contact.name}, contact card`}
                  className="min-w-0 cursor-pointer truncate text-left text-[13px] leading-4.5 font-medium text-foreground"
                >
                  {contact.name}
                </button>
              ) : (
                <span className="truncate text-[13px] leading-4.5 font-medium text-foreground">{contact.name}</span>
              )}
              {isOperator && <Badge>You</Badge>}
            </span>
            <span
              className={cn(
                'flex min-w-0 items-center gap-1 text-muted',
                // The invitee's line is plain text in the design; a contact's id is in the mono of handles.
                pending ? 'text-xs leading-4' : 'font-mono text-[11px] leading-4'
              )}
            >
              <span className="truncate">{contact.id}</span>
              {pending && <PendingNote contact={contact} />}
              <CopyButton
                value={contact.id}
                label={`Copy ${contact.name}'s ID`}
                className={ROW_COPY_CLASS_NAME}
                iconClassName="size-2.5"
              />
            </span>
          </div>
        </>,
        'gap-3'
      )}
      {cell(COLUMNS.email, <EmailCell contact={contact} />)}
      {cell(
        COLUMNS.channels,
        contact.channels.map((channel) => (
          <span key={channel.via} role="img" aria-label={CHANNEL_NAMES[channel.via]} title={CHANNEL_NAMES[channel.via]}>
            <ChannelLogo via={channel.via} size={16} />
          </span>
        )),
        'gap-2'
      )}
      {cell(
        COLUMNS.status,
        pending ? (
          // Someone without a channel isn't always invited: their link may have expired, or they were added
          // from the CLI without one.
          <Badge variant="pending">{contact.invite ? 'Invite sent' : 'Not joined'}</Badge>
        ) : (
          <Badge variant="success">Joined</Badge>
        )
      )}
      {cell(
        COLUMNS.added,
        <span className="text-[13px] leading-4.5 whitespace-nowrap text-secondary">
          <ShortDate iso={contact.createdAt} todayLabel="Today" />
        </span>
      )}
      {cell(
        COLUMNS.actions,
        <>
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
        </>,
        'justify-end gap-1'
      )}
    </tr>
  );
}

/**
 * The address with its copy icon, as the design draws it. An address that isn't confirmed carries a quiet
 * ring after it: agents don't write to it yet.
 */
function EmailCell({ contact }: { contact: Contact }) {
  const address = contact.emailVerification?.address ?? contact.email;
  const status = contact.emailVerification?.status ?? (contact.email ? 'unverified' : undefined);

  if (!address) {
    return <span className="text-[13px] leading-4.5 text-secondary">—</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] leading-4 text-muted">
      <span className="truncate">{address}</span>
      {status !== 'verified' && (
        <Tooltip label={status === 'pending' ? 'Waiting for them to confirm it' : 'Not confirmed yet'}>
          <span
            // Focusable, so the keyboard reaches the explanation too.
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the tooltip is the only way to read what the ring means
            tabIndex={0}
            className="flex size-3 shrink-0 items-center justify-center rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span aria-hidden="true" className="size-1.75 rounded-full border-[1.2px] border-muted" />
            <span className="sr-only">{status === 'pending' ? 'Waiting for confirmation' : 'Not confirmed'}</span>
          </span>
        </Tooltip>
      )}
      <CopyButton
        value={address}
        label={`Copy ${contact.name}'s email`}
        className={ROW_COPY_CLASS_NAME}
        iconClassName="size-3"
      />
    </span>
  );
}

/** "· pending, expires Oct 8" after the id of someone who hasn't joined yet. */
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
      <Button variant="secondary" className={cn(SMALL_BUTTON, 'disabled:opacity-50')} disabled>
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

type RemoveDialogContentProps = { contact: Contact; agentHandle: string; onRemoved: () => void };

function RemoveDialogContent({ contact, agentHandle, onRemoved }: RemoveDialogContentProps) {
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
      description={`${capitalize(agentHandle)} won't be able to message them. Open questions to them are cancelled.`}
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
      {/* It unfolds into place; going away, the dialog's own height eases back. */}
      {error && (
        <Fold open appear>
          <p role="alert" className="text-xs leading-4 text-danger">
            {error}
          </p>
        </Fold>
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

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
