'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';

import { CONFIGURE_PATH, DASHBOARD_HOME } from '@/components/dashboard/nav';
import { isToolId } from '@/lib/ai-tools';
import { findCurrentUser } from '@/lib/auth-page';
import type { ConnectCodeResult } from '@/lib/host-status';
import { isHostId } from '@/lib/hosts';
import { requireHumanAccount } from '@/lib/human-account';
import { sendAgentTestEmail } from '@/lib/human-agent-api';
import { HumanApiError, isHumanApiRefusal } from '@/lib/human-api-error';
import { requestForAccount } from '@/lib/human-api-key';
import { createConnectCode } from '@/lib/human-hosts-api';
import { describeProgress, loadSetupProgress, updateOnboardingState } from '@/lib/human-onboarding';
import { ensureRelay } from '@/lib/human-operator';
import { listConnectedTools } from '@/lib/human-tools-api';
import { AGENT_NAME_MAX_LENGTH, ONBOARDING_PATH, toHandle } from '@/lib/onboarding';

const DESTINATIONS = { inbox: DASHBOARD_HOME, configure: CONFIGURE_PATH, contacts: '/contacts' };

type Destination = keyof typeof DESTINATIONS;

export type AddressCheck = {
  handle: string;
  available: boolean;
  /** A free address close to the one that is taken. */
  suggestion?: string;
};

export type CreateInboxResult =
  | { ok: true }
  /** `check` comes along when the address was taken in the meantime, with another one to offer. */
  | { ok: false; message: string; check?: AddressCheck };

/** Whether an address is free, asked while the operator types. `null` for something that can't be one. */
export async function checkAddressAction(handle: string): Promise<AddressCheck | null> {
  if (!isHandle(handle)) {
    return null;
  }

  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });
  const user = await findCurrentUser();

  try {
    return await requestForAccount<AddressCheck>(account, '/v1/human/inbox-address', {
      query: {
        handle,
        ...(user?.primaryEmailAddress?.emailAddress ? { email: user.primaryEmailAddress.emailAddress } : {}),
      },
    });
  } catch {
    return null;
  }
}

/**
 * Step 1: makes the agent under the name the operator gave it, at the address they chose. The same
 * call as `setup`, so running it for an agent a terminal made in the meantime only names that one
 * and leaves the mailbox it already has.
 */
export async function createInboxAction(input: { name: string; handle: string }): Promise<CreateInboxResult> {
  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });
  const user = await findCurrentUser();
  const name = String(input.name ?? '').trim();

  if (!user) {
    return { ok: false, message: 'Your session has ended. Reload this page and sign in again.' };
  }

  if (!name || name.length > AGENT_NAME_MAX_LENGTH) {
    return { ok: false, message: `Give your agent a name of up to ${AGENT_NAME_MAX_LENGTH} characters.` };
  }

  const handle = String(input.handle ?? '');
  if (!isHandle(handle)) {
    return { ok: false, message: 'An address takes letters, digits and hyphens.' };
  }

  const email = user.primaryEmailAddress?.emailAddress;

  // Taken before the agent is made, so the agent is never older than the start of its own onboarding.
  const now = new Date().toISOString();

  let agentId: string;
  try {
    ({ agentId } = await ensureRelay(
      account,
      { firstName: user.firstName, lastName: user.lastName },
      { agentName: name, operatorEmail: email, inboxHandle: handle }
    ));
  } catch (error) {
    console.error('Failed to create the agent from the onboarding', error);

    if (error instanceof HumanApiError && error.code === 'inbox_address_taken') {
      return {
        ok: false,
        message: error.message,
        check: { handle, available: false, ...(error.suggestion ? { suggestion: error.suggestion } : {}) },
      };
    }

    return {
      ok: false,
      message: error instanceof HumanApiError ? error.message : 'Something went wrong. Please try again.',
    };
  }

  // Step 1 again for the same agent (a retry, or a form left open in another tab) keeps how far it got. A
  // new agent starts its steps from here: progress left over from one that was deleted (when forgetting it
  // then failed) must not take this one past its test and its host.
  await updateOnboardingState((state) => {
    const { handle: _chosenHandle, ...kept } = state;

    return !state.agentId || state.agentId === agentId
      ? { ...kept, startedAt: state.startedAt ?? now, agentId }
      : { startedAt: state.startedAt ?? now, agentId };
  });
  refresh();

  return { ok: true };
}

export type SendTestEmailResult = { ok: true } | { ok: false; message: string };

/**
 * Step 2: sends a real email from the Agent Email Inbox to the operator’s sign-up address.
 * Optional. The step already listens for any inbound mail, so a message already received stays received.
 */
export async function sendTestEmailAction(): Promise<SendTestEmailResult> {
  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });
  const user = await findCurrentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    return { ok: false, message: 'Your account has no email address to send the test to.' };
  }

  try {
    await sendAgentTestEmail(account, email);
  } catch (error) {
    console.error('Failed to send the test email', error);

    return {
      ok: false,
      message: error instanceof HumanApiError ? error.message : 'Something went wrong. Please try again.',
    };
  }

  await updateOnboardingState((state) => ({ ...state, testSentAt: new Date().toISOString() }));
  refresh();

  return { ok: true };
}

/** A real one-time code for the host the operator connects in step 3, made for the host chosen there (`host`). */
export async function createOnboardingConnectCodeAction(handle: string, host?: string): Promise<ConnectCodeResult> {
  if (!isHandle(handle)) {
    return { ok: false, error: 'This agent can’t be connected by name. Check its address on this page.' };
  }

  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });

  try {
    const code = await createConnectCode(account, handle, isHostId(host) ? host : undefined);

    return { ok: true, code, expiresInMs: Date.parse(code.expiresAt) - Date.now() };
  } catch (error) {
    if (isHumanApiRefusal(error) && error instanceof Error) {
      return { ok: false, error: error.message };
    }

    console.error('Failed to get an onboarding connect code', error);

    return { ok: false, error: 'We couldn’t get a code just now.' };
  }
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

/** Leaves step 4, and with it the onboarding, for a page of the dashboard. */
export async function finishOnboardingAction(destination: Destination): Promise<void> {
  const now = new Date().toISOString();
  await updateOnboardingState((state) => ({ ...state, finishedAt: state.finishedAt ?? now }));
  redirect(DESTINATIONS[destination] ?? DASHBOARD_HOME);
}

/** How far the setup got right now (`describeProgress`). The onboarding page reloads on a new answer. */
export async function readOnboardingStatusAction(): Promise<string> {
  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });
  const progress = await loadSetupProgress(account);
  if (progress.agent && progress.state.testLeftAt && !progress.hostStatus) {
    throw new Error('Failed to read the host status');
  }

  return describeProgress(progress);
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

/** Whether a chat app has signed in to the account. Its drawer on step 3 asks while it's open. */
export async function checkOnboardingToolConnectedAction(tool: string): Promise<boolean> {
  if (!isToolId(tool)) {
    return false;
  }

  const account = await requireHumanAccount({ returnTo: ONBOARDING_PATH });

  return (await listConnectedTools(account)).includes(tool);
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
