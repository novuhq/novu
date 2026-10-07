'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { type HumanAccount, readHumanAccount } from '@/lib/human-account';
import { HumanApiError } from '@/lib/human-api-error';
import { removeContact } from '@/lib/human-contacts-api';
import { createInviteLink } from '@/lib/human-invites-api';
import { findOperatorContactId } from '@/lib/human-operator';

import { type InviteFieldErrors, parseInviteFields } from './invite-fields';

const CONTACTS_PATH = '/contacts';
const SESSION_ENDED = 'Your session has ended. Sign in again to continue.';

export type CreateInviteResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error?: string; fieldErrors?: InviteFieldErrors };

export type RemoveContactResult = { ok: true; canceledInteractions: number } | { ok: false; error: string };

/** Makes an invite link for a new contact. The account comes from the session, never from the form. */
export async function createInviteAction(input: { contactId: string; name: string }): Promise<CreateInviteResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED };
  }

  const parsed = parseInviteFields({ contactId: String(input?.contactId ?? ''), name: String(input?.name ?? '') });
  if (parsed.errors) {
    return { ok: false, fieldErrors: parsed.errors };
  }

  try {
    const invite = await createInviteLink(account, parsed.fields);

    return { ok: true, url: invite.url, expiresAt: invite.expiresAt };
  } catch (error) {
    console.error('Failed to create an invite link', error);

    return {
      ok: false,
      error: describeError(error, 'Something went wrong while creating the link. Please try again.'),
    };
  } finally {
    // The contact is saved before its link is made, so the list can change even when the link fails.
    revalidatePath(CONTACTS_PATH);
  }
}

/** Removes a contact and cancels the open questions to them. The operator's own contact stays. */
export async function removeContactAction(contactId: string): Promise<RemoveContactResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED };
  }

  if (typeof contactId !== 'string' || !contactId) {
    return { ok: false, error: 'This contact can’t be removed.' };
  }

  try {
    if ((await findOperatorContactId(account)) === contactId) {
      return { ok: false, error: 'You can’t remove yourself from your contacts.' };
    }

    const removed = await removeContact(account, contactId);

    return { ok: true, canceledInteractions: removed.canceledInteractions };
  } catch (error) {
    console.error('Failed to remove a contact', error);

    return { ok: false, error: describeError(error, 'Something went wrong while removing them. Please try again.') };
  } finally {
    revalidatePath(CONTACTS_PATH);
  }
}

async function readSignedInAccount(): Promise<HumanAccount | null> {
  const user = await currentUser();

  return user ? readHumanAccount(user) : null;
}

/** The API writes its 4xx messages for people ("No Telegram or Slack channel is linked…"); the rest is ours. */
function describeError(error: unknown, fallback: string): string {
  if (error instanceof HumanApiError && error.status >= 400 && error.status < 500 && error.status !== 401) {
    return error.message;
  }

  return fallback;
}
