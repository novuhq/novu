import { useEffect } from 'react';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { AuthCard } from '../components/auth/auth-card';
import { UsecasePlaygroundHeader } from '../components/usecase-playground-header';
import { InboxEmbed } from '../components/welcome/inbox-embed';
import { useTelemetry } from '../hooks/use-telemetry';
import { ROUTES } from '../utils/routes';
import { TelemetryEvent } from '../utils/telemetry';

export function InboxEmbedPage() {
  const telemetry = useTelemetry();

  useEffect(() => {
    telemetry(TelemetryEvent.INBOX_EMBED_PAGE_VIEWED);
  }, [telemetry]);

  return (
    <AnimatedPage>
      <AuthCard className="mt-10 w-full max-w-[1230px]">
        <div className="w-full">
          <div className="flex flex-1 flex-col overflow-hidden">
            <UsecasePlaygroundHeader
              title="Minutes to a fully functional <Inbox/>"
              description="You're just a couple steps away from having a fully functional inbox."
              skipPath={ROUTES.WELCOME}
              onSkip={() =>
                telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
                  skippedFrom: 'inbox-embed',
                })
              }
              currentStep={3}
              totalSteps={4}
              showSkipButton={true}
            />
          </div>
          <InboxEmbed />
        </div>
      </AuthCard>
    </AnimatedPage>
  );
}
