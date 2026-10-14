import 'server-only';

import { clerkClient, type User } from '@clerk/nextjs/server';

import type { HostVia } from './onboarding';

/**
 * How far an operator got in the onboarding, and what they dismissed after it. Kept in the private
 * metadata of their Clerk user, next to where their backing account lives, so it follows them to another
 * browser and needs nothing from the API. Every time is an ISO timestamp.
 *
 * The fields marked "mock" stand in for what the API can't tell yet. They go away with the ticket named
 * next to them, and nothing else reads them.
 */
export type OnboardingState = {
  /**
   * When the operator first saw step 1. An agent made after that belongs to the steps. One made before
   * it, or one whose operator never saw step 1, has nothing left to walk through: it came from a
   * terminal, claimed or not, or it was in use long before the steps existed.
   */
  startedAt?: string;
  /** Mock (NV-9032): the address picked on step 1. The API assigns its own until it takes this one. */
  handle?: string;
  /** Mock (NV-9032): when the test email was "sent", and when its reply "landed". */
  testSentAt?: string;
  testReplyAt?: string;
  /** The operator moved on from step 2, with or without the test. */
  testLeftAt?: string;
  /** Mock (NV-9037): the operator copied the prompt, which is when the stand-in host starts connecting. */
  promptCopiedAt?: string;
  /**
   * A host connected to the agent. Real when a CLI login was approved in the browser or a connector
   * signed in; a stand-in (NV-9037) when it follows the copied prompt. `readAt` is when it read the
   * message that was waiting for it.
   */
  host?: { via: HostVia; connectedAt: string; readAt?: string };
  /** "Skip for now" or "Later": the dashboard is open, with its banners, while the setup isn't finished. */
  skippedAt?: string;
  /** The operator left step 4. */
  finishedAt?: string;
  /** The "is set up" banner on Configure was dismissed. */
  doneBannerDismissed?: boolean;
  /** The "Put your agent to work" list on the Inbox page: what was done, and whether it's hidden. */
  checklist?: { done?: string[]; hidden?: boolean };
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
