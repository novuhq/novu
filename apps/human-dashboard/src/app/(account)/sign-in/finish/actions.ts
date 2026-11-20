'use server';

import { unstable_rethrow } from 'next/navigation';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { requireHumanAccount } from '@/lib/human-account';
import { loadSetupProgress } from '@/lib/human-onboarding';
import { ONBOARDING_PATH } from '@/lib/onboarding';
import { belongsInOnboarding } from '@/lib/onboarding-progress';

/**
 * Where someone who just signed in goes instead of the dashboard's home. Its pages send an operator who hasn't
 * been through the onboarding on to it (`requireSetUpAgent`), but only once the dashboard has drawn itself around
 * them, so they would see an empty dashboard first. Asking here leads straight there. A new account is
 * set up by this as well, while `/sign-in/finish` says so.
 */
export async function homePathAction(): Promise<string> {
  try {
    const account = await requireHumanAccount({ returnTo: DASHBOARD_HOME });
    const { agent, step, state } = await loadSetupProgress(account);

    return belongsInOnboarding(agent, step, state) ? ONBOARDING_PATH : DASHBOARD_HOME;
  } catch (error) {
    // A redirect to sign-in travels as an error and has to keep going.
    unstable_rethrow(error);
    console.error('Failed to read the setup after signing in', error);

    // The dashboard copes with that by itself.
    return DASHBOARD_HOME;
  }
}
