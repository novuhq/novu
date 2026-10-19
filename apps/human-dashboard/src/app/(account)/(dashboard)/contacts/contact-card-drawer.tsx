'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useRef, useState, useTransition } from 'react';

import { DRAWER_HEADER, FOCUSED_INPUT } from '@/components/channels/setup-parts';
import { SlackSetup } from '@/components/channels/slack-setup';
import { TelegramSetup } from '@/components/channels/telegram-setup';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { CopyButton } from '@/components/ui/copy-button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, Input } from '@/components/ui/input';
import { Fold } from '@/components/ui/stepper';
import { toast } from '@/components/ui/toast';
import type { Contact, ContactChannel, ContactChannelVia } from '@/lib/human-contacts-api';
import type { SlackSetupState } from '@/lib/human-slack-setup';
import type { TelegramSetupState } from '@/lib/human-telegram-setup';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '../configure/channel-logo';
import { CrossFade } from '../inbox/cross-fade';
import { confirmOperatorEmailCodeAction, sendEmailLinkAction, setDefaultChannelAction } from './actions';
import { ContactAvatar } from './contact-avatar';
import { ShortDate } from './short-date';

/** The order the card lists the channels in, as the design does. */
const CHANNEL_ORDER: ContactChannelVia[] = ['email', 'telegram', 'slack'];

const CHANNEL_NAMES: Record<ContactChannelVia, string> = { email: 'Email', telegram: 'Telegram', slack: 'Slack' };

/** How the card's sentence names a channel: "Telegram first, then email." */
const SENTENCE_NAMES: Record<ContactChannelVia, string> = { email: 'email', telegram: 'Telegram', slack: 'Slack' };

/** The setup drawers read where they stand themselves when they open; the Contacts page doesn't ask ahead. */
const UNREAD_TELEGRAM: TelegramSetupState = { step: 'unknown' };
const UNREAD_SLACK: SlackSetupState = { step: 'unknown' };

const META = 'font-mono text-[11px] leading-3.5';

/** The card's small copy icons, after the id and the email: quiet until the pointer or the keyboard is on them. */
const CARD_COPY_CLASS_NAME = 'size-4 shrink-0 rounded-sm text-muted hover:bg-transparent hover:text-foreground';

/** What the card needs besides the operator's row of the table. */
export type ContactCardSetup = {
  /** The address the operator signs in with, so the card can say when it's the same one. */
  signInEmail: string | null;
  /** What the Telegram and Slack drawers hand the operator's own agent, as on the Configure page. */
  telegramPrompt: string;
  slackPrompt: string;
  /** What the Slack app is called until the operator names it. */
  slackAppName: string;
};

/** Where the card stands when it opens: with the email form out, a menu open, or a default being saved. */
export type ContactCardStart = {
  emailForm?: boolean;
  menu?: 'default' | 'add';
  savingDefault?: ContactChannelVia;
};

type ContactCardDrawerProps = {
  /**
   * The row whose card opens: the operator's own, or someone who joined. `null` while it isn't on the page,
   * and then there's nothing to open.
   */
  contact: Contact | null;
  /** How the agent is called in a sentence: its address without the domain. */
  agentHandle: string;
  setup: ContactCardSetup;
  start?: ContactCardStart;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Asks to remove the person whose card is open, as their row's bin does. Never offered on the operator's. */
  onRemove: (contact: Contact) => void;
};

/**
 * A contact card (`5.4 · Your contact card`): how the agent reaches the person, which channel it tries
 * first, and their email. On their own card the operator picks another default, changes or confirms their
 * email, and adds Telegram or Slack in the same drawers the Configure page has. Anyone else's card only
 * shows: how they're reached is theirs to change.
 */
export function ContactCardDrawer({
  contact,
  agentHandle,
  setup,
  start,
  open,
  onOpenChange,
  onRemove,
}: ContactCardDrawerProps) {
  const [setupDrawer, setSetupDrawer] = useState<'telegram' | 'slack' | null>(null);
  // The card stays as it was while the drawer slides out.
  const [shown, setShown] = useState(contact);
  if (contact && contact !== shown) {
    setShown(contact);
  }

  function openSetup(via: 'telegram' | 'slack') {
    onOpenChange(false);
    setSetupDrawer(via);
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        {shown && (
          <DrawerContent
            title="Contact"
            description={`How ${agentHandle} reaches ${shown.isOperator ? 'you' : shown.name}`}
            // The design's narrower drawer, with a line under the header and 20px to the edges, as Email's.
            className="max-w-140"
            headerClassName={cn(DRAWER_HEADER, 'items-center border-b border-border px-5 py-4.5 [&>div]:gap-0.5')}
            bodyClassName="gap-6.5 px-5 py-5.5"
            footerClassName="px-5 py-3.5"
            footer={
              <>
                {!shown.isOperator && (
                  <Button
                    variant="quiet"
                    className="mr-auto text-danger hover:text-danger"
                    onClick={() => onRemove(shown)}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    Remove
                    <span className="sr-only"> {shown.name}</span>
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button variant="secondary">Done</Button>
                </DrawerClose>
              </>
            }
          >
            <ContactCardBody
              // Each card starts from scratch: no email form or pick carried over from someone else's.
              key={shown.id}
              contact={shown}
              agentHandle={agentHandle}
              signInEmail={setup.signInEmail}
              start={start}
              open={open}
              onAddChat={openSetup}
            />
          </DrawerContent>
        )}
      </Drawer>
      <TelegramSetup
        setup={UNREAD_TELEGRAM}
        handle={agentHandle}
        prompt={setup.telegramPrompt}
        open={setupDrawer === 'telegram'}
        onOpenChange={(next) => setSetupDrawer(next ? 'telegram' : null)}
      />
      <SlackSetup
        setup={UNREAD_SLACK}
        agentName={setup.slackAppName}
        handle={agentHandle}
        prompt={setup.slackPrompt}
        open={setupDrawer === 'slack'}
        onOpenChange={(next) => setSetupDrawer(next ? 'slack' : null)}
      />
    </>
  );
}

type ContactCardBodyProps = {
  contact: Contact;
  agentHandle: string;
  signInEmail: string | null;
  start?: ContactCardStart;
  /** Whether the drawer is open, so a pending email is read again when the operator comes back to the tab. */
  open: boolean;
  onAddChat: (via: 'telegram' | 'slack') => void;
};

function ContactCardBody({ contact, agentHandle, signInEmail, start, open, onAddChat }: ContactCardBodyProps) {
  const router = useRouter();
  const [savingDefault, setSavingDefault] = useState<ContactChannelVia | null>(start?.savingDefault ?? null);
  const [, startSaving] = useTransition();
  const [emailFormOpen, setEmailFormOpen] = useState(start?.emailForm ?? false);
  // A new form for every opening, so it starts empty, and keeps what it showed while it folds away.
  const [emailFormKey, setEmailFormKey] = useState(0);
  const email = contact.emailVerification;
  const connected = CHANNEL_ORDER.filter((via) => contact.channels.some((channel) => channel.via === via));
  const missing = CHANNEL_ORDER.filter((via) => (via === 'email' ? !email : !connected.includes(via)));
  // The pick being saved shows at once; the page brings the saved one when the server is done.
  const defaultVia = savingDefault ?? contact.defaultVia;

  // A link waits in the operator's mailbox: coming back to this tab, likely after using it, reads it again.
  const waiting = contact.isOperator && open && email?.pending !== undefined;
  useEffect(() => {
    if (!waiting) {
      return;
    }

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [waiting, router]);

  function pickDefault(via: ContactChannelVia) {
    if (via === defaultVia) {
      return;
    }

    setSavingDefault(via);
    startSaving(async () => {
      const result = await setDefaultChannelAction(via);
      if (!result.ok) {
        toast(result.error, 'error');
      }

      setSavingDefault(null);
    });
  }

  function showEmailForm(show: boolean) {
    if (show && !emailFormOpen) {
      setEmailFormKey((key) => key + 1);
    }

    setEmailFormOpen(show);
  }

  function addChannel(via: ContactChannelVia) {
    if (via === 'email') {
      showEmailForm(true);
    } else {
      onAddChat(via);
    }
  }

  const card = <IdCard contact={contact} agentHandle={agentHandle} connected={connected} defaultVia={defaultVia} />;

  // Someone else's card has nothing to change: their default and their email are theirs.
  if (!contact.isOperator) {
    return card;
  }

  return (
    <>
      {card}

      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu defaultOpen={start?.menu === 'default'}>
            <DropdownMenuTrigger asChild disabled={connected.length < 2 || savingDefault !== null}>
              <Button variant="secondary" className={SMALL_BUTTON} pending={savingDefault !== null}>
                Change default
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {connected.map((via) => (
                <DropdownMenuItem key={via} onSelect={() => pickDefault(via)}>
                  <span className="flex-1">{CHANNEL_NAMES[via]}</span>
                  {via === defaultVia && <Check aria-label="Default" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="quiet"
            className={SMALL_BUTTON}
            aria-expanded={emailFormOpen}
            onClick={() => showEmailForm(!emailFormOpen)}
          >
            Change email
          </Button>
          <DropdownMenu defaultOpen={start?.menu === 'add'}>
            <DropdownMenuTrigger asChild disabled={missing.length === 0}>
              <Button variant="quiet" className={SMALL_BUTTON}>
                <Plus aria-hidden="true" className="size-3.5 text-foreground" />
                Add a channel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {missing.map((via) => (
                <DropdownMenuItem key={via} onSelect={() => addChannel(via)}>
                  {CHANNEL_NAMES[via]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Fold open={emailFormOpen} innerClassName="-mx-1.5 px-1.5">
          <EmailForm key={emailFormKey} onDone={() => showEmailForm(false)} />
        </Fold>
      </div>

      <EmailNote contact={contact} agentHandle={agentHandle} signInEmail={signInEmail} />
    </>
  );
}

type IdCardProps = {
  contact: Contact;
  agentHandle: string;
  connected: ContactChannelVia[];
  defaultVia?: ContactChannelVia;
};

/** The card itself (`Contact ID card`): the band with the person, one line per way to reach them, the order. */
function IdCard({ contact, agentHandle, connected, defaultVia }: IdCardProps) {
  const email = contact.emailVerification;
  const lines = CHANNEL_ORDER.filter((via) => (via === 'email' ? Boolean(email) : connected.includes(via)));
  const appearing = useNewLines(lines);

  return (
    <section
      aria-label={contact.isOperator ? 'Your contact card' : `${contact.name}’s contact card`}
      className="overflow-hidden rounded-xl border border-border-strong bg-background"
    >
      <div className="relative isolate h-26 overflow-hidden bg-subtle">
        {/*
          `Deco/Callout dither` at 45%, against the top right corner so it reaches the card's edge however
          wide the drawer is. The box around it breathes, as the agent card's does on the onboarding.
        */}
        <div className="pointer-events-none absolute inset-0 -z-10 animate-breathe motion-reduce:animate-none">
          <img
            src="/illustrations/dither-callout.svg"
            alt=""
            width={560}
            height={320}
            className="absolute -top-10.25 right-0 h-80 w-140 max-w-none opacity-45 select-none"
          />
        </div>
        {/* What shows of `Deco/Corner ticks`: the corner the card's rounding doesn't cut away. */}
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-1.25 bg-border-strong" />
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-1.25 w-px bg-border-strong" />

        <ContactAvatar seed={contact.id} className="absolute top-6 left-5 size-14" />
        <div className="absolute top-7 right-5 left-23 flex flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-lg leading-6 font-medium text-foreground">{contact.name}</h3>
            {contact.isOperator && (
              <span className="shrink-0 rounded border border-border-strong px-1.5 py-px font-mono text-[11px] leading-3.5 text-default">
                you · owner
              </span>
            )}
          </div>
          <p className="flex min-w-0 items-center gap-1 font-mono text-xs leading-4 whitespace-nowrap text-muted">
            <span className="shrink-0">contact ·</span>
            <span className="truncate">{contact.id}</span>
            <CopyButton
              value={contact.id}
              label={`Copy ${contact.name}'s ID`}
              className={CARD_COPY_CLASS_NAME}
              iconClassName="size-3"
            />
            <span className="shrink-0">
              · since <ShortDate iso={contact.createdAt} todayLabel="today" />
            </span>
          </p>
        </div>
      </div>

      <ul className="flex flex-col px-3 py-1.5">
        {lines.map((via) => (
          <li key={via}>
            <Fold open appear={appearing.has(via)}>
              <ChannelLine
                via={via}
                value={via === 'email' ? (email?.address ?? CHANNEL_NAMES.email) : chatValue(via, contact.channels)}
                copyLabel={via === 'email' ? `Copy ${contact.name}'s email` : undefined}
                isDefault={via === defaultVia}
                status={via === 'email' ? email?.status : undefined}
              />
            </Fold>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-border px-5 py-2.75">
        {/* A new key when the order changes, so the sentence fades into the new one. */}
        <p
          key={describeOrder(agentHandle, contact, defaultVia)}
          className="animate-overlay-in text-xs leading-4 text-secondary motion-reduce:animate-none"
        >
          {describeOrder(agentHandle, contact, defaultVia)}
        </p>
      </div>
    </section>
  );
}

type ChannelLineProps = {
  via: ContactChannelVia;
  value: string;
  /** For a value worth copying, such as the email: the copy icon's label. */
  copyLabel?: string;
  isDefault: boolean;
  /** How far the email's confirmation got. */
  status?: 'verified' | 'pending' | 'unverified';
};

/**
 * One way to reach the person. The default one is lit and says so; moving the default moves the light
 * and the label with it, each fading.
 */
function ChannelLine({ via, value, copyLabel, isDefault, status }: ChannelLineProps) {
  const layer =
    'col-start-1 row-start-1 justify-self-end transition-opacity duration-200 ease-out motion-reduce:transition-none';

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-2.5 transition-colors duration-200 ease-out motion-reduce:transition-none',
        isDefault ? 'bg-subtle' : 'bg-transparent'
      )}
    >
      <ChannelLogo via={via} size={16} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {/* A new value, such as a handle learned while the card is open, fades in where the old one fades out. */}
        <CrossFade id={value} value={value}>
          {(shown, className) => (
            <span className={cn('truncate font-mono text-[13px] leading-4.5 text-foreground', className)}>{shown}</span>
          )}
        </CrossFade>
        {copyLabel && (
          <CopyButton value={value} label={copyLabel} className={CARD_COPY_CLASS_NAME} iconClassName="size-3" />
        )}
      </span>
      <span className="inline-grid shrink-0">
        <span aria-hidden={!isDefault} className={cn(layer, META, 'text-accent', !isDefault && 'opacity-0')}>
          default
        </span>
        {status && (
          <span aria-hidden={isDefault} className={cn(layer, isDefault && 'opacity-0')}>
            {/* A new key when it changes, so "pending" fades into "verified". */}
            <EmailStatus key={status} status={status} />
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * What a chat line says: how the person shows on the app (`@dima`, `dima · acme.slack.com`), or the app's name
 * until the agent has learned it.
 */
function chatValue(via: 'telegram' | 'slack', channels: ContactChannel[]): string {
  const channel = channels.find((candidate) => candidate.via === via);
  if (!channel?.handle) {
    return CHANNEL_NAMES[via];
  }

  return channel.workspace ? `${channel.handle} · ${channel.workspace}` : channel.handle;
}

function EmailStatus({ status }: { status: 'verified' | 'pending' | 'unverified' }) {
  return (
    <span
      className={cn('flex animate-overlay-in items-center gap-1.25 text-secondary motion-reduce:animate-none', META)}
    >
      {status === 'verified' && <Check aria-hidden="true" className="size-3 text-success" strokeWidth={2.25} />}
      {status}
    </span>
  );
}

/**
 * The line under the channels: the one the agent tries first, and the one it falls back on while that one
 * isn't connected (the channel connected first). One channel needs no order.
 */
function describeOrder(agentHandle: string, contact: Contact, defaultVia?: ContactChannelVia): string {
  const agent = agentHandle.charAt(0).toUpperCase() + agentHandle.slice(1);
  const who = contact.isOperator ? 'you' : contact.name;
  const byConnection = [...contact.channels].sort(
    (a, b) => Date.parse(a.connectedAt ?? '') - Date.parse(b.connectedAt ?? '') || 0
  );
  const first = byConnection.find((channel) => channel.via === defaultVia) ?? byConnection[0];
  const then = byConnection.find((channel) => channel !== first);

  if (!first) {
    return `${agent} can’t reach ${who} yet.`;
  }

  if (!then) {
    return `${agent} reaches ${who} on ${SENTENCE_NAMES[first.via]}.`;
  }

  return `${agent} tries ${SENTENCE_NAMES[first.via]} first, then ${SENTENCE_NAMES[then.via]}.`;
}

/** The lines that weren't on the card a moment ago, such as Slack just connected: they unfold into place. */
function useNewLines(lines: ContactChannelVia[]): ReadonlySet<ContactChannelVia> {
  const seen = useRef<Set<ContactChannelVia> | null>(null);
  const previous = seen.current;
  const appearing = new Set(previous ? lines.filter((via) => !previous.has(via)) : []);

  useEffect(() => {
    seen.current = new Set(lines);
  });

  return appearing;
}

/** Asks for the new address and sends it a code. The verified one keeps working until that's used. */
function EmailForm({ onDone }: { onDone: () => void }) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    startSending(async () => {
      const result = await sendEmailLinkAction(address);
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3 pt-3 pb-1">
      <Field
        label="New email"
        hint="We’ll send a 6-digit code. Your current email keeps working until it’s confirmed."
        error={error}
      >
        {(field) => (
          <Input
            {...field}
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={cn(FOCUSED_INPUT, !field.invalid && 'ring-border')}
          />
        )}
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" className={SMALL_BUTTON} pending={sending}>
          Send code
        </Button>
        <Button variant="quiet" className={SMALL_BUTTON} disabled={sending} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

type EmailNoteProps = { contact: Contact; agentHandle: string; signInEmail: string | null };

/**
 * The notes under the actions: where a confirmation code went, with a place to enter it, or that the email
 * isn't confirmed yet; and that it's the address the operator signs in with, when it is.
 */
function EmailNote({ contact, agentHandle, signInEmail }: EmailNoteProps) {
  const email = contact.emailVerification;
  const [error, setError] = useState<string>();
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sending, startSending] = useTransition();
  const [confirming, startConfirming] = useTransition();
  const linkTo = email?.pending?.address ?? (email?.status === 'unverified' ? email.address : undefined);
  const signsInWith = Boolean(email && signInEmail && email.address.toLowerCase() === signInEmail.toLowerCase());

  function sendCode() {
    if (!linkTo) {
      return;
    }

    setError(undefined);
    startSending(async () => {
      const result = await sendEmailLinkAction(linkTo);
      if (result.ok) {
        toast(`Code sent to ${linkTo}.`);
      } else {
        setError(result.error);
      }
    });
  }

  function confirm(value: string) {
    setError(undefined);
    setInvalid(false);
    startConfirming(async () => {
      const result = await confirmOperatorEmailCodeAction(value);
      if (result.ok) {
        setCode('');
        toast('Email confirmed.');

        return;
      }

      setCode('');
      setInvalid(result.invalid);
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-col">
      <Fold open={Boolean(linkTo)} innerClassName="-mx-1.5 px-1.5">
        <div
          key={`${email?.status}-${linkTo}`}
          className="flex animate-overlay-in flex-col gap-3 pb-1.5 motion-reduce:animate-none"
        >
          <p className="text-xs leading-4 text-muted">
            {email?.pending ? (
              <>Enter the code we sent to {email.pending.address}. </>
            ) : (
              <>
                {linkTo} isn’t confirmed yet, so {agentHandle} can’t email you there.{' '}
              </>
            )}
            <TextButton onClick={sendCode} pending={sending}>
              {email?.pending ? 'Send again' : 'Send code'}
            </TextButton>
          </p>
          {email?.pending && (
            <CodeInput
              value={code}
              onChange={(value) => {
                setCode(value);
                setInvalid(false);
              }}
              onComplete={confirm}
              label="Code from the email"
              invalid={invalid}
              disabled={confirming || sending}
              autoFocus
            />
          )}
        </div>
      </Fold>
      <Fold open={Boolean(error)}>
        <p role="alert" className="pb-1.5 text-xs leading-4 text-danger">
          {error}
        </p>
      </Fold>
      <Fold open={signsInWith}>
        <p className="text-xs leading-4 text-muted">Your email is also how you sign in.</p>
      </Fold>
    </div>
  );
}

function TextButton({ onClick, pending, children }: { onClick: () => void; pending: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className="cursor-pointer font-medium text-default underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
    >
      {children}
      {pending && <span aria-hidden="true">…</span>}
    </button>
  );
}
