import { ConnectResourcesSection } from '@/components/connect/dashboard/connect-resources-section';
import { ConnectWelcomeHeading } from '@/components/connect/dashboard/connect-welcome-heading';
import { ExplorePlatformSection } from '@/components/connect/dashboard/explore-platform-section';
import { RecentConversationsSection } from '@/components/connect/dashboard/recent-conversations-section';
import { SetThingsUpSection } from '@/components/connect/dashboard/set-things-up-section';
import { useConnectSetupSteps } from '@/components/connect/dashboard/use-connect-setup-steps';
import { WhatsNextSection } from '@/components/connect/dashboard/whats-next-section';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';

export function ConnectDashboardPage() {
  const { isComplete, isLoading } = useConnectSetupSteps();

  return (
    <>
      <PageMeta title="Connect · Dashboard" />
      <DashboardLayout>
        <div className="flex flex-col gap-2.5 p-2.5">
          <ConnectWelcomeHeading completedOnboarding={isComplete} />
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_375px]">
            <div className="flex min-w-0 flex-col gap-2.5">
              <SetThingsUpSection isLoading={isLoading} />
              <RecentConversationsSection />
            </div>
            <aside className="flex flex-col gap-2.5">
              {isComplete ? <WhatsNextSection /> : null}
              <ConnectResourcesSection />
              <ExplorePlatformSection />
            </aside>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
