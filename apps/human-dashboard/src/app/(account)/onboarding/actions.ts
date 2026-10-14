'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';

import { CONFIGURE_PATH, DASHBOARD_HOME } from '@/components/dashboard/nav';
import { findCurrentUser } from '@/lib/auth-page';
import { requireHumanAccount } from '@/lib/human-account';
import { HumanApiError } from '@/lib/human-api-error';
import { describeProgress, loadSetupProgress, updateOnboardingState } from '@/lib/human-onboarding';
import { ensureRelay } from '@/lib/human-operator';
import { AGENT_NAME_MAX_LENGTH, ONBOARDING_PATH, toHandle } from '@/lib/onboarding';
import { type AddressCheck, checkAddress } from '@/lib/onboarding-mocks';

const DESTINATIONS = { inbox: DASHBOARD_HOME, configure: CONFIGURE_PATH, contacts: '/contacts' };

type Destination = keyof typeof DESTINATIONS;

export type CreateInboxResult =
  | { ok: true }
  /** `check` comes along when the address was taken in the meantime, with another one to offer. */
  | { ok: false; message: string; check?: AddressCheck };

/** Whether an address is free, asked while the operator types. `null` for something that can't be one. */
export async function checkAddressAction(handle: string): Promise<AddressCheck | null> {
  if (!isHandle(handle)) {
    return null;
  }

  const user = await findCurrentUser();

  return checkAddress(handle, user?.primaryEmailAddress?.emailAddress ?? null);
}

/**
 * Step 1: makes the agent under the name the operator gave it. The same call as `setup`, so running
 * it for an agent a terminal made in the meantime only names that one.
 */
export async function createInboxAction(input: { name: string; handle: string }): Promise<CreateInboxResult> {
  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });
  const user = await findCurrentUser();
  const name = String(input.name ?? '').trim();
  const handle = String(input.handle ?? '');

  if (!user) {
    return { ok: false, message: 'Your session has ended. Reload this page and sign in again.' };
  }

  if (!name || name.length > AGENT_NAME_MAX_LENGTH) {
    return { ok: false, message: `Give your agent a name of up to ${AGENT_NAME_MAX_LENGTH} characters.` };
  }

  if (!isHandle(handle)) {
    return { ok: false, message: 'An address takes letters, digits and hyphens.' };
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const check = checkAddress(handle, email ?? null);
  if (!check.available) {
    return { ok: false, message: `${handle} is taken`, check };
  }

  // Taken before the agent is made, so the agent is never older than the start of its own onboarding.
  const now = new Date().toISOString();

  try {
    await ensureRelay(
      account,
      { firstName: user.firstName, lastName: user.lastName },
      { agentName: name, operatorEmail: email }
    );
  } catch (error) {
    console.error('Failed to create the agent from the onboarding', error);

    return {
      ok: false,
      message: error instanceof HumanApiError ? error.message : 'Something went wrong. Please try again.',
    };
  }

  await updateOnboardingState((state) => ({ ...state, startedAt: state.startedAt ?? now, handle }));
  refresh();

  return { ok: true };
}

/** Step 2: "sends" the test email. Sending it again leaves a reply that already landed where it is. */
export async function sendTestEmailAction(): Promise<void> {
  await updateOnboardingState((state) => ({ ...state, testSentAt: new Date().toISOString() }));
  refresh();
}

/**
 * Leaves step 2: on to connecting the agent, with the test or without it, or out to the dashboard for
 * now. Either way the test is behind the operator, and "Continue setup" opens step 3.
 */
export async function leaveTestAction(how: 'connect' | 'skip' | 'later'): Promise<void> {
  const now = new Date().toISOString();
  await updateOnboardingState((state) => ({
    ...state,
    testLeftAt: state.testLeftAt ?? now,
    ...(how === 'later' ? { skippedAt: now } : {}),
  }));

  if (how === 'later') {
    redirect(DASHBOARD_HOME);
  }

  refresh();
}

/** Step 3: the operator copied the prompt or its commands. The stand-in host connects a moment later. */
export async function notePromptCopiedAction(): Promise<void> {
  const now = new Date().toISOString();
  await updateOnboardingState((state) => (state.promptCopiedAt ? state : { ...state, promptCopiedAt: now }));
}

/** "Skip for now": opens the dashboard, where the banners keep pointing back to the step left behind. */
export async function skipForNowAction(destination: Destination = 'inbox'): Promise<void> {
  await updateOnboardingState((state) => ({ ...state, skippedAt: new Date().toISOString() }));
  redirect(DESTINATIONS[destination] ?? DASHBOARD_HOME);
}

/** Leaves step 4, and with it the onboarding, for a page of the dashboard. */
export async function finishOnboardingAction(destination: Destination): Promise<void> {
  const now = new Date().toISOString();
  await updateOnboardingState((state) => ({ ...state, finishedAt: state.finishedAt ?? now }));
  redirect(DESTINATIONS[destination] ?? DASHBOARD_HOME);
}

/** How far the setup got right now (`describeProgress`). The onboarding page reloads on a new answer. */
export async function readOnboardingStatusAction(): Promise<string> {
  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });

  return describeProgress(await loadSetupProgress(account));
}

/** Configure: the "is set up" banner was dismissed and stays away. */
export async function dismissDoneBannerAction(): Promise<void> {
  await updateOnboardingState((state) => ({ ...state, doneBannerDismissed: true }));
  refresh();
}

/** Inbox: hides the "Put your agent to work" list for good. */
export async function hideChecklistAction(): Promise<void> {
  await updateOnboardingState((state) => ({ ...state, checklist: { ...state.checklist, hidden: true } }));
  refresh();
}

/** Inbox: ticks an item of the list off, once the operator did what it asks. */
export async function completeChecklistItemAction(item: string): Promise<void> {
  if (!CHECKLIST_ITEMS.has(item)) {
    return;
  }

  const now = new Date().toISOString();
  await updateOnboardingState((state) => {
    const done = state.checklist?.done ?? {};

    return done[item] ? state : { ...state, checklist: { ...state.checklist, done: { ...done, [item]: now } } };
  });
  refresh();
}

const CHECKLIST_ITEMS = new Set(['address', 'card']);

function isHandle(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && toHandle(value) === value;
}
