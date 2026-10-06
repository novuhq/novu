import { SignOutButton } from '@clerk/nextjs';
import { currentUser, type User } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Command } from '@/components/site/command';
import { Panel } from '@/components/site/panel';
import { SiteFrame } from '@/components/site/site-frame';
import { buttonClassName } from '@/components/ui/button';
import { readHumanAccount } from '@/lib/human-account';
import { type Channel, listChannels } from '@/lib/human-channels-api';
import { type Contact, listContactsPage } from '@/lib/human-contacts-api';

import { DeleteAccountButton } from './delete-account-button';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

type Setup =
  | { status: 'ready'; channels: Channel[]; contacts: Contact[]; moreContacts: boolean }
  | { status: 'empty' }
  | { status: 'unavailable' };

/**
 * The operator's Human account. Visiting it never creates the backing organization (the first claim
 * does, in that link's region); the setup is read on the server with the environment's key.
 */
export default async function AccountPage(props: PageProps<'/account'>) {
  const user = await currentUser();
  if (!user) {
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: '/account' })}`);
  }

  const { claimed } = await props.searchParams;
  const setup = await loadSetup(user);
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <SiteFrame className="px-4 py-14 md:px-8 md:py-20">
      <Panel
        eyebrow="your account"
        title={
          <>
            Hi <em className="font-display tracking-tight text-accent">{user.firstName || 'there'}</em>
          </>
        }
        description={
          claimed === '1' ? (
            <>
              Your setup is now in your Human account. Run <Command>human login</Command> on your computer to keep using
              it from there.
            </>
          ) : (
            email && `Signed in as ${email}.`
          )
        }
      >
        <SetupSummary setup={setup} />

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-border pt-6">
          <SignOutButton redirectUrl="/">
            <button type="button" className={buttonClassName('outline')}>
              Sign out
            </button>
          </SignOutButton>
          <DeleteAccountButton />
        </div>
      </Panel>
    </SiteFrame>
  );
}

async function loadSetup(user: User): Promise<Setup> {
  const account = readHumanAccount(user);
  if (!account) {
    return { status: 'empty' };
  }

  try {
    const [channels, { contacts, next }] = await Promise.all([listChannels(account), listContactsPage(account)]);

    return { status: 'ready', channels, contacts, moreContacts: Boolean(next) };
  } catch (error) {
    console.error('Failed to load the Human account setup', error);

    return { status: 'unavailable' };
  }
}

function SetupSummary({ setup }: { setup: Setup }) {
  if (setup.status === 'unavailable') {
    return (
      <p
        role="alert"
        className="rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
      >
        We couldn&apos;t load your setup right now. Please refresh the page.
      </p>
    );
  }

  if (setup.status === 'empty' || (setup.channels.length === 0 && setup.contacts.length === 0)) {
    return (
      <p className="text-[15px] leading-[1.375] tracking-tight text-foreground/70">
        Nothing here yet. Run <Command>human login</Command> in your terminal to use this account with the human CLI,
        then <Command>human setup</Command> to connect a channel. Its channels and contacts show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SummaryList
        title="Channels"
        emptyText="No channels connected yet."
        rows={setup.channels.map((channel) => ({
          key: channel.identifier,
          primary: channel.label,
          secondary: channel.active ? 'connected' : 'turned off',
        }))}
      />
      <SummaryList
        title="Contacts"
        emptyText="No contacts yet."
        note={setup.moreContacts ? `Showing the first ${setup.contacts.length} contacts.` : undefined}
        rows={setup.contacts.map((contact) => ({
          key: contact.id,
          primary: contact.name,
          secondary: contact.email ?? contact.id,
        }))}
      />
      <p className="text-sm tracking-tight text-foreground/60">
        To use this account from another computer, run <Command>human login</Command> there.
      </p>
    </div>
  );
}

type SummaryRow = { key: string; primary: string; secondary: string };

type SummaryListProps = { title: string; emptyText: string; note?: string; rows: SummaryRow[] };

function SummaryList({ title, emptyText, note, rows }: SummaryListProps) {
  return (
    <section>
      <h2 className="font-mono text-sm tracking-tight text-foreground/50">{title}</h2>
      {rows.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-md bg-black ring-1 ring-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-baseline justify-between gap-3 p-3">
              <span className="truncate text-[15px] font-medium tracking-tight">{row.primary}</span>
              <span className="truncate font-mono text-xs tracking-tight text-foreground/50">{row.secondary}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm tracking-tight text-foreground/60">{emptyText}</p>
      )}
      {note && <p className="mt-2 font-mono text-xs tracking-tight text-foreground/50">{note}</p>}
    </section>
  );
}
