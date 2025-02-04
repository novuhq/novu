import { AuthCard } from '../components/auth/auth-card';
import { ROUTES } from '../utils/routes';
import { InboxEmbed } from '../components/welcome/inbox-embed';
import { UsecasePlaygroundHeader } from '../components/usecase-playground-header';
import { useTelemetry } from '../hooks/use-telemetry';
import { TelemetryEvent } from '../utils/telemetry';
import { useEffect } from 'react';
import { AnimatedPage } from '@/components/onboarding/animated-page';

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
              title="Integrate <Inbox /> in less than 4 minutes"
              description="You're just a couple steps away from your having a fully functional notification center in your app."
              skipPath={ROUTES.WELCOME}
              onSkip={() =>
                telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
                  skippedFrom: 'inbox-embed',
                })
              }
            />
          </div>
          <InboxEmbed />
        </div>
      </AuthCard>
    </AnimatedPage>
  );
}
