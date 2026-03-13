import { IEnvironment } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { RiCheckboxCircleFill, RiLoader3Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useFirstTriggerDetection } from '@/hooks/use-first-trigger-detection';
import { usePageVisitTimestamp } from '@/hooks/use-page-visit-timestamp';
import { useTelemetry } from '@/hooks/use-telemetry';
import { type CodeSnippet, createCurlSnippet } from '@/utils/code-snippets';
import { TelemetryEvent } from '@/utils/telemetry';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../../config';
import { useInitDemoWorkflow } from '../../hooks/use-init-demo-workflow';
import { ROUTES } from '../../utils/routes';
import { Button } from '../primitives/button';
import { CodeBlock } from '../primitives/code-block';
import { ToastIcon } from '../primitives/sonner';
import { showErrorToast, showToast } from '../primitives/sonner-helpers';

type InboxConnectedGuideProps = {
  subscriberId: string;
  environment: IEnvironment;
};

function generateCurlSnippet(userId: string, apiKey: string): string {
  if (!apiKey) {
    throw new Error('API key not found');
  }

  if (!userId || !userId.trim()) {
    throw new Error('User ID not found');
  }

  const snippetProps: CodeSnippet = {
    identifier: ONBOARDING_DEMO_WORKFLOW_ID,
    to: { subscriberId: userId },
    payload: '{}',
    secretKey: apiKey,
  };

  return createCurlSnippet(snippetProps);
}

function WorkflowIntegrationSteps({ userId, apiKey }: { userId: string; apiKey: string }) {
  const curl = useMemo(() => generateCurlSnippet(userId, apiKey), [userId, apiKey]);

  return (
    <div className="mt-5 w-full min-w-0">
      <CodeBlock code={curl} language="shell" title="Terminal" />
    </div>
  );
}

function showStatusToast(variant: 'success' | 'error', message: string) {
  showToast({
    children: () => (
      <>
        <ToastIcon variant={variant} />
        <span className="text-sm">{message}</span>
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

export function InboxConnectedGuide({ subscriberId, environment }: InboxConnectedGuideProps) {
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  useInitDemoWorkflow(environment);
  const apiKeysQuery = useFetchApiKeys();
  const apiKeys = apiKeysQuery.data?.data ?? [];
  const apiKey = apiKeys[0]?.key ?? '';
  const hasValidApiKey = !apiKeysQuery.isLoading && !apiKeysQuery.error && apiKey;

  // Track page visit timestamp (created when component mounts)
  const visitTimestamp = usePageVisitTimestamp();

  // First trigger detection - uses the page visit timestamp
  const {
    hasDetectedFirstTrigger,
    isWaitingForTrigger,
    startWaiting,
    isLoading: isTriggerDetectionLoading,
    error: triggerDetectionError,
    isError: isTriggerDetectionError,
    workflowsError,
    isWorkflowsError,
  } = useFirstTriggerDetection({
    enabled: true,
    firstVisitTimestamp: visitTimestamp,
    onFirstTriggerDetected: () => {
      showStatusToast('success', 'API trigger detected');
    },
  });

  // Handle trigger detection errors
  useEffect(() => {
    if (isTriggerDetectionError && triggerDetectionError) {
      console.error('Trigger detection error:', triggerDetectionError);
      showErrorToast('Failed to detect API trigger. Please refresh the page and try again.', 'Detection Error');
    }
  }, [isTriggerDetectionError, triggerDetectionError]);

  // Handle workflows loading errors
  useEffect(() => {
    if (isWorkflowsError && workflowsError) {
      console.error('Workflows loading error:', workflowsError);
      showErrorToast('Failed to load workflows. Please refresh the page and try again.', 'Loading Error');
    }
  }, [isWorkflowsError, workflowsError]);

  // Auto-start waiting when component mounts and API key is available
  useEffect(() => {
    if (hasValidApiKey && !hasDetectedFirstTrigger && !isWaitingForTrigger) {
      // Add a small delay to avoid immediate polling
      const timer = setTimeout(() => {
        startWaiting();
      }, 2000); // Increased delay to 2 seconds

      return () => {
        clearTimeout(timer);
      };
    }
  }, [hasValidApiKey, hasDetectedFirstTrigger, isWaitingForTrigger, startWaiting]);

  async function handleCompleteOnboarding() {
    try {
      // Track telemetry event
      await telemetry(TelemetryEvent.ONBOARDING_COMPLETED);
    } catch (error) {
      console.error('Failed to track onboarding completion telemetry:', error);
      // Continue with navigation even if telemetry fails
    }

    try {
      // Navigate to welcome page
      navigate(ROUTES.INBOX_EMBED_SUCCESS);
    } catch (error) {
      console.error('Failed to navigate after onboarding completion:', error);
      showErrorToast('Failed to complete onboarding. Please try refreshing the page.', 'Navigation Error');
    }
  }

  return (
    <div className="flex flex-col pl-[72px]">
      {/* Combined section with left content and right code snippets */}
      <div className="relative p-8 pb-12 pt-16">
        <div className="absolute left-1 top-0 bottom-0 w-px bg-[#eeeef0]"></div>
        <div className="relative mt-8 flex gap-8 first:mt-0 min-w-0">
          {/* Left side - both status sections stacked */}
          <div className="flex w-[350px] flex-col gap-8">
            {/* First section - Inbox connected */}
            <div className="relative flex gap-8">
              <div className="absolute -left-[38px] flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <RiCheckboxCircleFill className="text-success h-4 w-4" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-success text-sm font-medium">In-App Channel Integration Activated</span>
                </div>
                <p className="text-foreground-400 text-xs">
                  You've initialized your Inbox. The last step is to make an API call to confirm everything is working.
                </p>
              </div>
            </div>

            {/* Second section - Waiting for trigger */}
            <div className="relative flex gap-8">
              <div className="absolute -left-[38px] flex h-5 w-5 items-center justify-center rounded-full bg-white">
                {isTriggerDetectionLoading ? (
                  <RiLoader3Line className="h-4 w-4 text-primary animate-spin" />
                ) : isTriggerDetectionError || isWorkflowsError ? (
                  <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xs">!</span>
                  </div>
                ) : hasDetectedFirstTrigger ? (
                  <RiCheckboxCircleFill className="text-success h-4 w-4" />
                ) : (
                  <RiLoader3Line className="h-4 w-4 text-primary animate-spin" />
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {isTriggerDetectionLoading
                      ? 'Loading trigger detection...'
                      : isTriggerDetectionError || isWorkflowsError
                        ? 'Error loading trigger detection'
                        : hasDetectedFirstTrigger
                          ? 'Ready to complete onboarding'
                          : 'Waiting for your first API trigger...'}
                  </span>
                </div>
                <p className="text-foreground-400 text-xs">
                  {isTriggerDetectionLoading
                    ? 'Setting up trigger detection...'
                    : isTriggerDetectionError || isWorkflowsError
                      ? 'There was an error setting up trigger detection. Please refresh the page.'
                      : hasDetectedFirstTrigger
                        ? 'Great! We detected your API trigger. Click the button to complete your onboarding.'
                        : "Copy and run the code snippet below to trigger your first notification. We'll detect it automatically."}
                </p>

                {/* Complete onboarding button - positioned under the waiting text */}
                <div className="flex justify-start mt-4">
                  <Button onClick={handleCompleteOnboarding} variant="primary" mode="gradient">
                    <RiCheckboxCircleFill className="mr-1 h-4 w-4" />
                    Complete Onboarding
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - code snippets spanning full height */}
          <div className="flex w-[480px] flex-col gap-6 -mt-4">
            {apiKeysQuery.isLoading ? (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-8">
                <div className="flex items-center justify-center gap-3 text-gray-600">
                  <RiLoader3Line className="h-5 w-5 animate-spin" />
                  <span>Loading API key...</span>
                </div>
              </div>
            ) : apiKeysQuery.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="flex flex-col gap-3 text-center">
                  <div className="text-red-600 font-medium">⚠️ Error loading API key</div>
                  <div className="text-gray-600 text-sm">
                    Please check your connection and{' '}
                    <button
                      onClick={() => apiKeysQuery.refetch()}
                      className="text-blue-600 underline hover:text-blue-700 font-medium"
                    >
                      try again
                    </button>
                  </div>
                </div>
              </div>
            ) : !apiKey ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                <div className="flex flex-col gap-3 text-center">
                  <div className="text-amber-600 font-medium">⚠️ No API key found</div>
                  <div className="text-gray-600 text-sm">
                    Please generate an API key in your{' '}
                    <a
                      href="/settings"
                      className="text-blue-600 underline hover:text-blue-700 font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      settings
                    </a>{' '}
                    first.
                  </div>
                </div>
              </div>
            ) : (
              <WorkflowIntegrationSteps userId={subscriberId} apiKey={apiKey} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
