import 'server-only';

import { createHash } from 'node:crypto';

import { HANDLE_MAX_LENGTH, toHandle } from './onboarding';
import type { OnboardingState } from './onboarding-state';

/*
 * Everything the onboarding fakes until the API can do it. Each part names the ticket that replaces it,
 * and the rest of the dashboard only ever goes through this file to get at one.
 */

/* Choosing an address (NV-9032). Today the API assigns an address itself and has no way to ask for one. */

export type AddressCheck = {
  handle: string;
  available: boolean;
  /** A free address close to the one that is taken. */
  suggestion?: string;
};

/** Addresses the stand-in answers "taken" for, so that state can be seen. */
const TAKEN_HANDLES = new Set(['admin', 'agent', 'hello', 'help', 'inbox', 'info', 'support', 'team']);

/** Mail providers whose domain says nothing about who the operator is. */
const SHARED_MAIL_DOMAINS = new Set(['gmail', 'googlemail', 'hotmail', 'icloud', 'live', 'me', 'outlook', 'proton']);

export function checkAddress(handle: string, operatorEmail: string | null): AddressCheck {
  if (!TAKEN_HANDLES.has(handle)) {
    return { handle, available: true };
  }

  return { handle, available: false, suggestion: suggestAddress(handle, operatorEmail) };
}

/** The taken address with the operator's company after it, as in `atlas-acme` for someone at acme.co. */
function suggestAddress(handle: string, operatorEmail: string | null): string {
  const [mailbox = '', domain = ''] = (operatorEmail ?? '').toLowerCase().split('@');
  const company = toHandle(domain.split('.')[0] ?? '');
  const own = company && !SHARED_MAIL_DOMAINS.has(company) ? company : toHandle(mailbox.split(/[.+_-]/)[0] ?? '');
  const suffix = own && !TAKEN_HANDLES.has(`${handle}-${own}`) ? own : 'hq';

  return `${handle.slice(0, HANDLE_MAX_LENGTH - suffix.length - 1)}-${suffix}`;
}

/* The test email (NV-9032). Nothing is sent: the reply "lands" by itself a moment later. */

const REPLY_LANDS_AFTER_MS = 6000;

/* Connecting a host (NV-9037). There is no one-time code yet and the API doesn't know its hosts. */

const HOST_CONNECTS_AFTER_MS = 8000;
const HOST_READS_AFTER_MS = 2000;

const CODE_VALID_MS = 10 * 60 * 1000;

/** Letters and digits that can't be mistaken for one another when read off a screen. */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;

/** A code that looks like the real one will: four characters, a new one every ten minutes. It opens nothing. */
export function connectCode(userId: string, now = Date.now()): string {
  const digest = createHash('sha256')
    .update(`${userId}:${Math.floor(now / CODE_VALID_MS)}`)
    .digest();

  return Array.from({ length: CODE_LENGTH }, (_, index) => CODE_ALPHABET[digest[index] % CODE_ALPHABET.length]).join(
    ''
  );
}

/**
 * Lets the stand-ins catch up with the clock: a reply lands a moment after the test email went out, and a
 * host connects a moment after the prompt was copied. Returns the new state, or `null` when nothing is due.
 */
export function advanceMocks(state: OnboardingState, now = Date.now()): OnboardingState | null {
  let next = state;

  if (next.testSentAt && !next.testReplyAt && now - Date.parse(next.testSentAt) >= REPLY_LANDS_AFTER_MS) {
    next = { ...next, testReplyAt: new Date(now).toISOString() };
  }

  if (next.promptCopiedAt && !next.host && now - Date.parse(next.promptCopiedAt) >= HOST_CONNECTS_AFTER_MS) {
    next = {
      ...next,
      host: {
        via: 'cli',
        connectedAt: new Date(now).toISOString(),
        // It reads what was waiting for it: the reply to the test email.
        ...(next.testReplyAt ? { readAt: new Date(now + HOST_READS_AFTER_MS).toISOString() } : {}),
      },
    };
  }

  return next === state ? null : next;
}
