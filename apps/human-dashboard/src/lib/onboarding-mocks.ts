import 'server-only';

import { createHash } from 'node:crypto';

import type { OnboardingState } from './onboarding-state';

/*
 * What the onboarding still fakes. The address and the test email are real. Connecting a host on step 3
 * is not (NV-9037): the code opens nothing, and a host appears a moment after the prompt is copied.
 */

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
 * Lets the stand-in host catch up with the clock: it connects a moment after the prompt was copied.
 * Returns the new state, or `null` when nothing is due.
 */
export function advanceMocks(state: OnboardingState, now = Date.now()): OnboardingState | null {
  if (!state.promptCopiedAt || state.host || now - Date.parse(state.promptCopiedAt) < HOST_CONNECTS_AFTER_MS) {
    return null;
  }

  return {
    ...state,
    host: {
      via: 'cli',
      connectedAt: new Date(now).toISOString(),
      // It reads what was waiting for it: the reply to the test email.
      ...(state.testReplyAt ? { readAt: new Date(now + HOST_READS_AFTER_MS).toISOString() } : {}),
    },
  };
}
