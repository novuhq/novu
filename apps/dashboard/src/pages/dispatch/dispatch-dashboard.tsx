import { DashboardLayout } from '@/components/dashboard-layout';
import { DispatchResourcesSection } from '@/components/dispatch/dashboard/dispatch-resources-section';
import { DispatchWelcomeHeading } from '@/components/dispatch/dashboard/dispatch-welcome-heading';
import { ExplorePlatformSection } from '@/components/dispatch/dashboard/explore-platform-section';
import { RecentConversationsSection } from '@/components/dispatch/dashboard/recent-conversations-section';
import { SetThingsUpSection } from '@/components/dispatch/dashboard/set-things-up-section';
import { StartFromTemplateSection } from '@/components/dispatch/dashboard/start-from-template-section';
import { useDispatchSetupSteps } from '@/components/dispatch/dashboard/use-dispatch-setup-steps';
import { WhatsNextSection } from '@/components/dispatch/dashboard/whats-next-section';
import { PageMeta } from '@/components/page-meta';

export function DispatchDashboardPage() {
  const { isComplete, isLoading } = useDispatchSetupSteps();

  return (
    <>
      <PageMeta title="Dispatch · Dashboard" />
      <DashboardLayout>
        <div className="flex flex-col gap-2.5 p-2.5">
          <DispatchWelcomeHeading completedOnboarding={isComplete} />
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_375px]">
            <div className="flex min-w-0 flex-col gap-2.5">
              <SetThingsUpSection isLoading={isLoading} />
              <RecentConversationsSection />
            </div>
            <aside className="flex flex-col gap-2.5">
              {isComplete ? <WhatsNextSection /> : <StartFromTemplateSection />}
              <DispatchResourcesSection />
              <ExplorePlatformSection />
            </aside>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
