'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { type HumanAccount, readHumanAccount } from '@/lib/human-account';
import { AGENT_NOT_SET_UP_MESSAGE, getRelayAgent } from '@/lib/human-agent-api';
import { HumanApiError } from '@/lib/human-api-error';
import {
  type ContactChannelVia,
  changeOperatorEmail,
  confirmOperatorEmailCode,
  removeContact,
  setOperatorDefaultChannel,
} from '@/lib/human-contacts-api';
import { createInviteLink } from '@/lib/human-invites-api';
import { findOperatorContactId } from '@/lib/human-operator';

import { type InviteFieldErrors, parseInviteFields } from './invite-fields';

const CONTACTS_PATH = '/contacts';
const SESSION_ENDED = 'Your session has ended. Sign in again to continue.';

/** What `<input type="email">` takes, near enough; the API checks the address again. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHANNEL_VIAS: readonly ContactChannelVia[] = ['telegram', 'slack', 'email'];

export type CreateInviteResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error?: string; fieldErrors?: InviteFieldErrors };

export type RemoveContactResult = { ok: true; canceledInteractions: number } | { ok: false; error: string };

export type ContactCardResult = { ok: true } | { ok: false; error: string };

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
    // The API would make the agent for an invite. An account only gets its agent from `setup`.
    if (!(await getRelayAgent(account))) {
      return { ok: false, error: AGENT_NOT_SET_UP_MESSAGE };
    }

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

/**
 * Removes a contact and cancels the open questions to them. The operator's own contact stays. The page
 * isn't refreshed from here: the table folds the row away first and then asks for the new list itself.
 */
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
  }
}

/** Makes one of the operator's connected channels the one agents try first. */
export async function setDefaultChannelAction(via: ContactChannelVia): Promise<ContactCardResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED };
  }

  if (!CHANNEL_VIAS.includes(via)) {
    return { ok: false, error: 'Pick Telegram, Slack or email.' };
  }

  try {
    await setOperatorDefaultChannel(account, via);

    return { ok: true };
  } catch (error) {
    console.error('Failed to change the default channel', error);

    return { ok: false, error: describeError(error, 'Something went wrong while saving it. Please try again.') };
  } finally {
    revalidatePath(CONTACTS_PATH);
  }
}

/**
 * Sends the operator's address a code to confirm it: a new one, the one they signed up with, or the one
 * still waiting for its code again. Agents keep the verified address until the new one is confirmed.
 */
export async function sendEmailLinkAction(address: string): Promise<ContactCardResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED };
  }

  const email = String(address ?? '').trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  try {
    await changeOperatorEmail(account, email);

    return { ok: true };
  } catch (error) {
    console.error('Failed to send the email confirmation', error);

    return { ok: false, error: describeEmailError(error) };
  } finally {
    revalidatePath(CONTACTS_PATH);
  }
}

export type ConfirmEmailCodeResult = { ok: true } | { ok: false; error: string; invalid: boolean };

/** Confirms the operator's pending address with the 6-digit code from the email. */
export async function confirmOperatorEmailCodeAction(code: string): Promise<ConfirmEmailCodeResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED, invalid: false };
  }

  const digits = String(code ?? '').replace(/\D/g, '');
  if (digits.length !== 6) {
    return { ok: false, error: 'Enter the 6-digit code from the email.', invalid: true };
  }

  try {
    await confirmOperatorEmailCode(account, digits);

    return { ok: true };
  } catch (error) {
    console.error('Failed to confirm the email code', error);

    return {
      ok: false,
      error: describeEmailError(error),
      invalid: error instanceof HumanApiError && error.code === 'verification_code_invalid',
    };
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

/** The email link's refusals, in the dashboard's words where the API's speak of the CLI. */
function describeEmailError(error: unknown): string {
  if (error instanceof HumanApiError) {
    if (error.code === 'address_already_verified') {
      return 'That’s already your email.';
    }

    // Without its own email channel the agent has nothing to send the link from.
    if (error.status === 404 && error.code === 'not_found') {
      return 'Your agent has no email address to send from yet. Set it up on the Configure page.';
    }
  }

  return describeError(error, 'Something went wrong while sending the code. Please try again.');
}
