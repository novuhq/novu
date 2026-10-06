import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopBar } from '@/components/dashboard/top-bar';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The dashboard shell around the operator's pages: sidebar, top bar and the content column.
 * Only signed-in operators get in; everyone else goes to sign in first.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: DASHBOARD_HOME })}`);
  }

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Your account';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col md:flex-row">
        {/* The agent's own name and picture arrive with the Agent page (NV-8966). */}
        <Sidebar agent={{ name: 'Your agent', status: 'Not set up' }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={{ name, email, imageUrl: user.hasImage ? user.imageUrl : null }} />
          <main className="mx-auto flex w-full max-w-230 flex-1 flex-col gap-6 px-6 py-6">{children}</main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
