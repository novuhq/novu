import { useOrganization } from '@clerk/clerk-react';
import { useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import { useNavigate } from 'react-router-dom';
import { Notification5Fill } from '@/components/icons';
import { useEnvironment } from '@/context/environment/hooks';

import { useInitDemoWorkflow } from '@/hooks/use-init-demo-workflow';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../../config';
import { useTelemetry } from '../../hooks/use-telemetry';
import { ROUTES } from '../../utils/routes';
import { TelemetryEvent } from '../../utils/telemetry';
import { Button } from '../primitives/button';
import { ToastIcon } from '../primitives/sonner';
import { showToast } from '../primitives/sonner-helpers';
import { UsecasePlaygroundHeader } from '../usecase-playground-header';
import { InboxPreviewContent } from './inbox-preview-content';

const PLAYGROUND_CONFIG = {
  title: 'The <Inbox/> your app deserves',
  description: 'See in-app notifications in action with a live preview of the inbox component',
  currentStep: 2,
  totalSteps: 4,
} as const;

function showCustomToast(
  message: string,
  variant: 'success' | 'error',
  position: 'bottom-center' | 'top-center' | 'bottom-right' = 'bottom-center'
) {
  showToast({
    children: () => (
      <>
        <ToastIcon variant={variant} />
        <span className="whitespace-nowrap text-sm">{message}</span>
      </>
    ),
    options: {
      position,
      style: {
        left: '50%',
        transform: 'translateX(-50%)',
      },
    },
  });
}

export function InboxPlayground({ appId, subscriberId }: { appId: string; subscriberId: string }) {
  const { organization } = useOrganization();
  const { currentEnvironment: environment } = useEnvironment();
  const { triggerWorkflow, isPending } = useTriggerWorkflow();

  const [hasNotificationBeenSent, setHasNotificationBeenSent] = useState(false);
  const navigate = useNavigate();
  const telemetry = useTelemetry();

  useInitDemoWorkflow(environment);

  if (!environment) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading environment...</p>
        </div>
      </div>
    );
  }

  const handleSendNotification = async () => {
    try {
      await triggerWorkflow({
        name: ONBOARDING_DEMO_WORKFLOW_ID,
        to: subscriberId,
        payload: {
          __source: 'inbox-onboarding',
        },
      });

      telemetry(TelemetryEvent.INBOX_NOTIFICATION_SENT);
      setHasNotificationBeenSent(true);
      showCustomToast('Notification sent successfully!', 'success', 'bottom-right');
    } catch (error) {
      console.error('Failed to send notification:', error);
      showCustomToast('Failed to send notification. Please try again later.', 'error');
    }
  };

  const handleNextStepClick = () => {
    if (!appId) {
      return;
    }

    telemetry(TelemetryEvent.INBOX_NEXT_STEP_CLICKED);
    const queryParams = new URLSearchParams();

    if (environment?._id) {
      queryParams.set('environmentId', environment._id);
    }

    const qs = queryParams.toString();
    navigate(qs ? `${ROUTES.INBOX_EMBED}?${qs}` : ROUTES.INBOX_EMBED);
  };

  const handleSkipClick = () => {
    telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED);
    const queryParams = new URLSearchParams();

    if (environment?._id) {
      queryParams.set('environmentId', environment._id);
    }

    const qs = queryParams.toString();
    navigate(qs ? `${ROUTES.INBOX_EMBED}?${qs}` : ROUTES.INBOX_EMBED);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-3">
      <UsecasePlaygroundHeader
        title={PLAYGROUND_CONFIG.title}
        description={PLAYGROUND_CONFIG.description}
        showSkipButton={false}
        showBackButton={true}
        showStepper={true}
        currentStep={PLAYGROUND_CONFIG.currentStep}
        totalSteps={PLAYGROUND_CONFIG.totalSteps}
      />

      <div
        className="flex flex-1 flex-col"
        style={{
          backgroundImage: 'url(/images/auth/Content.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="hidden flex-1 items-start justify-start md:flex">
            <div className="ml-10 mt-9">
              <div className="text-1xl font-medium text-gray-500">
                {organization?.name ? `${organization.name} App` : 'ACME App'}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center md:items-end">
            <div className="flex items-start justify-center px-4 py-6 md:justify-end md:px-0">
              <div className="nv-no-scrollbar h-[380px] w-full max-w-[375px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_8px_25px_-8px_rgba(0,0,0,0.15)] md:mr-20 md:mt-16 md:h-[470px] md:w-[375px]">
                <InboxPreviewContent />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Show with optimized interaction states */}
      <div className="bg-muted">
        <div className="flex items-center justify-center gap-2 p-3">
          {!hasNotificationBeenSent ? (
            <Button
              variant="secondary"
              size="xs"
              trailingIcon={Notification5Fill}
              isLoading={isPending}
              onClick={handleSendNotification}
              disabled={isPending}
              className="px-2"
            >
              Send test notification
            </Button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSkipClick}
                className="text-text-soft hover:text-text-sub cursor-pointer text-xs transition-colors mr-3"
              >
                Skip
              </button>
              <Button
                onClick={handleNextStepClick}
                disabled={!appId}
                size="xs"
                trailingIcon={RiArrowRightSLine}
                className="px-2.5 text-white disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 100%), #DD2450',
                  boxShadow: '0px 1px 2px rgba(14, 18, 27, 0.24), 0px 0px 0px 1px #DD2450',
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: 500,
                  fontFeatureSettings: '"cv09" on, "ss11" on, "calt" off, "liga" off',
                }}
              >
                Next Step
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
