import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { useState } from 'react';
import { RiFileCopyLine } from 'react-icons/ri';
import { Notification5Fill } from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../../config';
import { useTelemetry } from '../../hooks/use-telemetry';
import { ROUTES } from '../../utils/routes';
import { TelemetryEvent } from '../../utils/telemetry';
import { Button } from '../primitives/button';
import { showToast } from '../primitives/sonner-helpers';
import { UsecasePlaygroundHeader } from '../usecase-playground-header';
import { ToastIcon } from '../primitives/sonner';
import { useOrganization } from '@clerk/clerk-react';
import { InboxPreviewContent } from './inbox-preview-content';
import { useInitDemoWorkflow } from '@/hooks/use-init-demo-workflow';
import { useEnvironment } from '@/context/environment/hooks';

const PLAYGROUND_CONFIG = {
  title: 'The <Inbox/> your app deserves',
  description: "This is what your users will see. Try sending a message. We've prefilled it for you.",
  currentStep: 2,
  totalSteps: 4,
} as const;

function generateCurlCommand(userId: string): string {
  return `curl -X POST ${window.location.origin}/api/v1/events/trigger \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "name": "${ONBOARDING_DEMO_WORKFLOW_ID}",
    "to": {
      "subscriberId": ${JSON.stringify(userId)}
    },
    "payload": {}
  }'`;
}

function showCustomToast(message: string, variant: 'success' | 'error') {
  showToast({
    children: () => (
      <>
        <ToastIcon variant={variant} />
        <span className="whitespace-nowrap text-sm">{message}</span>
      </>
    ),
    options: {
      position: 'bottom-center',
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

  // Initialize the demo workflow before triggering
  useInitDemoWorkflow(environment);

  // Early return if environment is not available
  if (!environment) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading environment...</p>
        </div>
      </div>
    );
  }

  // Ensure we're using the environment identifier consistently
  const effectiveAppId = environment?.identifier || appId;

  const handleSendNotification = async () => {
    try {
      await triggerWorkflow({
        name: ONBOARDING_DEMO_WORKFLOW_ID,
        to: subscriberId,
        payload: {},
      });

      telemetry(TelemetryEvent.INBOX_NOTIFICATION_SENT);
      setHasNotificationBeenSent(true);
      showCustomToast('Notification sent successfully!', 'success');
    } catch (error) {
      console.error('Failed to send notification:', error);
      showCustomToast('Failed to send notification. Please try again later.', 'error');
    }
  };

  const handleCopyCurlCommand = async () => {
    try {
      if (!subscriberId) {
        throw new Error('User ID not found. Please refresh the page.');
      }

      const curlCommand = generateCurlCommand(subscriberId);
      await navigator.clipboard.writeText(curlCommand);
      showCustomToast('cURL command copied to clipboard!', 'success');
    } catch (error) {
      showCustomToast('Failed to copy cURL command', 'error');
    }
  };

  const handleImplementClick = () => {
    telemetry(TelemetryEvent.INBOX_IMPLEMENTATION_CLICKED, {});
    const queryParams = new URLSearchParams({}).toString();
    navigate(`${ROUTES.INBOX_EMBED}?${queryParams}`);
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
        <div className="flex flex-1">
          {/* App Name Section - Show immediately */}
          <div className="flex flex-1 items-start justify-start">
            <div className="ml-10 mt-9">
              <div className="text-1xl font-medium text-gray-500">
                {organization?.name ? `${organization.name} App` : 'ACME App'}
              </div>
            </div>
          </div>

          {/* Inbox Preview Section - Show with optimized loading */}
          <div className="flex flex-1 flex-col">
            <div className="flex items-start justify-end">
              <div className="nv-no-scrollbar mr-20 mt-16 h-[470px] w-[375px] rounded-lg border border-gray-200 bg-white shadow-[0_8px_25px_-8px_rgba(0,0,0,0.15)]">
                <InboxPreviewContent />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Show with optimized interaction states */}
      <div className="bg-muted">
        <div className="flex justify-center gap-2 p-3">
          <Button
            variant="secondary"
            size="xs"
            trailingIcon={hasNotificationBeenSent ? Notification5Fill : RiFileCopyLine}
            onClick={hasNotificationBeenSent ? handleSendNotification : handleCopyCurlCommand}
            mode="outline"
            className="px-2"
            isLoading={hasNotificationBeenSent && isPending}
            disabled={hasNotificationBeenSent && isPending}
          >
            {hasNotificationBeenSent ? 'Send again' : 'Copy cURL'}
          </Button>
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
              Send notification
            </Button>
          ) : (
            <button
              onClick={handleImplementClick}
              disabled={!appId}
              className="flex h-8 w-auto flex-none flex-row items-center justify-center gap-1 rounded-lg border-0 px-2.5 py-2 text-xs font-medium text-white disabled:opacity-50"
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
              Implement &lt;Inbox /&gt;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
