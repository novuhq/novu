import 'server-only';

import { clerkClient, type User } from '@clerk/nextjs/server';

/**
 * How far an operator got in the onboarding, and what they dismissed after it. Kept in the private
 * metadata of their Clerk user, next to where their backing account lives, so it follows them to another
 * browser and needs nothing from the API. Every time is an ISO timestamp.
 */
export type OnboardingState = {
  /**
   * When the operator first saw step 1. An agent made after that belongs to the steps. One made before
   * it, or one whose operator never saw step 1, has nothing left to walk through: it came from a
   * terminal, claimed or not, or it was in use long before the steps existed.
   */
  startedAt?: string;
  /** The agent step 1 made. The progress below is its own: step 1 giving back another agent starts it over. */
  agentId?: string;
  /**
   * Left over from when step 1 stored a chosen address. New progress does not write it. Sentences use the
   * agent's name, and the mailbox is the address the API assigned.
   */
  handle?: string;
  /** When the optional test email was sent from the Agent Email Inbox. */
  testSentAt?: string;
  /** When a human email arrived after the agent was created. Who sent it is read with the inbox, not stored. */
  testReplyAt?: string;
  /** The operator moved on from step 2, with or without the test. */
  testLeftAt?: string;
  /** "Skip for now" or "Later": the dashboard is open, with its banners, while the setup isn't finished. */
  skippedAt?: string;
  /** The operator left step 4. */
  finishedAt?: string;
  /** The "is set up" banner on Configure was dismissed. */
  doneBannerDismissed?: boolean;
  /**
   * The "Put your agent to work" list on the Inbox page: when each item was ticked off, and whether it's
   * hidden. One key per item, because Clerk merges nested keys: two ticks saved at the same moment, from
   * two tabs, both stay. A list would be replaced whole by the second.
   */
  checklist?: { done?: Record<string, string>; hidden?: boolean };
};

const METADATA_KEY = 'onboarding';

export function readOnboardingState(user: User): OnboardingState {
  const stored = user.privateMetadata?.[METADATA_KEY];

  return stored && typeof stored === 'object' ? (stored as OnboardingState) : {};
}

/**
 * Replaces the stored state with `after`. Clerk merges metadata key by key, so a field that `after`
 * dropped is sent as `null` to be forgotten; that is what `before` is for.
 */
export async function writeOnboardingState(
  userId: string,
  before: OnboardingState,
  after: OnboardingState
): Promise<OnboardingState> {
  const dropped = Object.fromEntries(Object.keys(before).map((key) => [key, null]));

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, { privateMetadata: { [METADATA_KEY]: { ...dropped, ...after } } });

  return after;
}
