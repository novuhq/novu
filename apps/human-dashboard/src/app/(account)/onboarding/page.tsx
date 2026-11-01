import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Toaster } from '@/components/ui/toast';
import { isHostId } from '@/lib/hosts';
import { requireHumanAccount } from '@/lib/human-account';
import { loadOnboardingView, noteOnboardingStarted } from '@/lib/human-onboarding';
import { ONBOARDING_CONNECT_PARAM, ONBOARDING_PATH, onboardingConnectPath } from '@/lib/onboarding';

import { OnboardingFlow } from './onboarding-flow';

export const metadata: Metadata = {
  title: 'Set up your agent',
  robots: { index: false, follow: false },
};

/**
 * Where a new operator lands after signing up: four steps that give their agent an address, try it, hand
 * it to a host and open it to people. It has one address, and the step it shows comes from how far the
 * setup got, so a refresh or "Continue setup" opens the step that was left.
 *
 * `?connect=codex` (`onboardingConnectPath`) starts the "Connect" step on that host, for an operator who came
 * from a public host page's "sign in to get your code".
 *
 * An operator whose agent came from a terminal has nothing to do here and goes on to the inbox.
 */
export default async function OnboardingPage(props: PageProps<'/onboarding'>) {
  const searchParams = await props.searchParams;
  const connectParam = searchParams[ONBOARDING_CONNECT_PARAM];
  const connectHost = isHostId(connectParam) ? connectParam : null;
  const account = await requireHumanAccount({
    returnTo: connectHost ? onboardingConnectPath(connectHost) : ONBOARDING_PATH,
  });
  const view = await loadOnboardingView(account);
  if (!view) {
    redirect(DASHBOARD_HOME);
  }

  if (view.step === 'address') {
    await noteOnboardingStarted();
  }

  return (
    <>
      <OnboardingFlow view={view} initialHost={connectHost} />
      <Toaster />
    </>
  );
}
