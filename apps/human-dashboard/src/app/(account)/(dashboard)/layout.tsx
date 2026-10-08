import { currentUser, type User } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { ReactNode } from 'react';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Sidebar, type SidebarAgent } from '@/components/dashboard/sidebar';
import { TopBar } from '@/components/dashboard/top-bar';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName, DEFAULT_AGENT_NAME, getRelayAgent } from '@/lib/human-agent-api';

const AGENT_NOT_SET_UP: SidebarAgent = { name: 'Your agent', status: 'Not set up' };

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The dashboard shell around the operator's pages: sidebar, top bar and the content column.
 * Only signed-in operators get in. `proxy.ts` sends everyone else to sign in and back to the page
 * they asked for; the check here is the backstop if a request ever gets past it.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: DASHBOARD_HOME })}`);
  }

  const agent = await loadSidebarAgent(user);
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
    </TooltipProvider>
  );
}

/**
 * Who the sidebar says the agent is. The account and its agent come from the sign-up webhook, but the
 * first page after signing up usually loads before that webhook has run. So the shell asks for the
 * account the same way the pages do, which sets it up on the spot when it isn't there yet, instead of
 * showing "Not set up" until the next reload.
 *
 * A failure shows the agent as not set up instead of taking the whole dashboard down: an error in a
 * layout has no error page of its own.
 */
async function loadSidebarAgent(user: User): Promise<SidebarAgent> {
  try {
    const account = await requireHumanAccount({ returnTo: DASHBOARD_HOME });
    const agent = await getRelayAgent(account);
    if (!agent) {
      return AGENT_NOT_SET_UP;
    }

    return {
      name: agentDisplayName(agent, user.firstName) ?? AGENT_NOT_SET_UP.name,
      status: `${agent.name || DEFAULT_AGENT_NAME} agent`,
    };
  } catch (error) {
    // A redirect to sign-in travels as an error and has to keep going.
    unstable_rethrow(error);
    console.error('Failed to load the agent for the sidebar', error);

    return AGENT_NOT_SET_UP;
  }
}
