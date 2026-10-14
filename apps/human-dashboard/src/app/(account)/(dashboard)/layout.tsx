import type { Metadata } from 'next';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { ReactNode } from 'react';

import { readOnboardingStatusAction } from '@/app/(account)/onboarding/actions';
import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Sidebar, type SidebarAgent } from '@/components/dashboard/sidebar';
import { TopBar } from '@/components/dashboard/top-bar';
import { StatusPoll } from '@/components/ui/status-poll';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { findCurrentUser } from '@/lib/auth-page';
import { requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName } from '@/lib/human-agent-api';
import { describeProgress, isSetupUnfinished, loadSetupProgress } from '@/lib/human-onboarding';

const AGENT_NOT_SET_UP: SidebarAgent = { name: 'Your agent', status: 'Not set up', setUp: false };

/**
 * How often an unfinished setup is asked about. A host usually connects in another tab or a terminal, and
 * coming back to this tab asks at once; the interval is for an operator who never left it.
 */
const SETUP_POLL_MS = 10_000;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The dashboard shell around the operator's pages: sidebar, top bar and the content column.
 * Only signed-in operators get in. `proxy.ts` sends everyone else to sign in and back to the page
 * they asked for; the check here is the backstop if a request ever gets past it.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await findCurrentUser();
  if (!user) {
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: DASHBOARD_HOME })}`);
  }

  const { agent, setupStatus } = await loadSidebarAgent();
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Your account';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <Sidebar agent={agent} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={{ name, email, imageUrl: user.hasImage ? user.imageUrl : null }} />
          <main className="mx-auto flex w-full max-w-300 flex-1 flex-col gap-5 px-6 pt-7 pb-20 md:px-10">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
      {setupStatus && <StatusPoll status={setupStatus} read={readOnboardingStatusAction} everyMs={SETUP_POLL_MS} />}
    </TooltipProvider>
  );
}

/**
 * Who the sidebar says the agent is: "Not set up" until the onboarding has made it, which only Settings
 * is open before. The account comes from the sign-up webhook, but the first page after signing up
 * usually loads before that webhook has run. So the shell asks for the account the same way the pages
 * do, which creates it on the spot when it isn't there yet.
 *
 * While the setup is unfinished, `setupStatus` is its `describeProgress`. The shell keeps asking for it,
 * so a host that connects elsewhere clears the banners and the sidebar's dot without a reload.
 *
 * A failure shows the agent as not set up instead of taking the whole dashboard down: an error in a
 * layout has no error page of its own.
 */
async function loadSidebarAgent(): Promise<{ agent: SidebarAgent; setupStatus: string | null }> {
  try {
    const account = await requireHumanAccount({ returnTo: DASHBOARD_HOME });
    const progress = await loadSetupProgress(account);
    const { agent, step } = progress;
    if (!agent) {
      return { agent: AGENT_NOT_SET_UP, setupStatus: null };
    }

    const setupUnfinished = isSetupUnfinished(step);

    return {
      agent: {
        name: agentDisplayName(agent),
        status: 'Your agent',
        setUp: true,
        pictureUrl: agent.pictureUrl,
        setupUnfinished,
      },
      setupStatus: setupUnfinished ? describeProgress(progress) : null,
    };
  } catch (error) {
    // A redirect to sign-in travels as an error and has to keep going.
    unstable_rethrow(error);
    console.error('Failed to load the agent for the sidebar', error);

    return { agent: AGENT_NOT_SET_UP, setupStatus: null };
  }
}
