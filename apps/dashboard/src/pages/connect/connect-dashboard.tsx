import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConnectResourcesSection } from '@/components/connect/dashboard/connect-resources-section';
import { ConnectWelcomeHeading } from '@/components/connect/dashboard/connect-welcome-heading';
import { ExplorePlatformSection } from '@/components/connect/dashboard/explore-platform-section';
import { RecentConversationsSection } from '@/components/connect/dashboard/recent-conversations-section';
import { SetThingsUpSection } from '@/components/connect/dashboard/set-things-up-section';
import { useConnectSetupSteps } from '@/components/connect/dashboard/use-connect-setup-steps';
import { WhatsNextSection } from '@/components/connect/dashboard/whats-next-section';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { useTelemetry } from '@/hooks/use-telemetry';
import { isOnboardingSource } from '@/utils/onboarding-redirect';
import { TelemetryEvent } from '@/utils/telemetry';

export function ConnectDashboardPage() {
  const { isComplete, showOnboardingMessaging } = useConnectSetupSteps();
  const telemetry = useTelemetry();
  const [searchParams] = useSearchParams();
  const fromOnboarding = isOnboardingSource(searchParams);

  useEffect(() => {
    telemetry(TelemetryEvent.CONNECT_DASHBOARD_PAGE_VIEWED, { fromOnboarding });
  }, [fromOnboarding, telemetry]);

  return (
    <>
      <PageMeta title="Connect · Dashboard" />
      <DashboardLayout>
        <div className="flex flex-col gap-2.5 p-2.5">
          <ConnectWelcomeHeading completedOnboarding={!showOnboardingMessaging} />
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_375px]">
            <div className="flex min-w-0 flex-col gap-2.5">
              <SetThingsUpSection />
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
