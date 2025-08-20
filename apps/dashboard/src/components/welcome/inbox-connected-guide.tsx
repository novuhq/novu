import { IEnvironment } from '@novu/shared';
import { RiCheckboxCircleFill, RiLoader3Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Notification5Fill } from '@/components/icons';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../../config';
import { useInitDemoWorkflow } from '../../hooks/use-init-demo-workflow';
import { ROUTES } from '../../utils/routes';
import { generateCurlCommand } from '../auth/inbox-playground';
import { Button } from '../primitives/button';
import { ToastIcon } from '../primitives/sonner';
import { showToast } from '../primitives/sonner-helpers';

type InboxConnectedGuideProps = {
  subscriberId: string;
  environment: IEnvironment;
};

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
  const { triggerWorkflow, isPending } = useTriggerWorkflow(environment);
  useInitDemoWorkflow(environment);
  const apiKeysQuery = useFetchApiKeys();
  const apiKeys = apiKeysQuery.data?.data ?? [];
  const apiKey = apiKeys[0]?.key ?? '';
  const hasValidApiKey = !apiKeysQuery.isLoading && !apiKeysQuery.error && apiKey;

  const curlCommand = hasValidApiKey ? generateCurlCommand(subscriberId, apiKey) || '' : '';

  async function handleSendNotification() {
    try {
      await triggerWorkflow({
        name: ONBOARDING_DEMO_WORKFLOW_ID,
        to: subscriberId,
        payload: {},
      });

      showStatusToast('success', 'Notification sent successfully!');
      navigate(ROUTES.INBOX_EMBED_SUCCESS);
    } catch (error) {
      showStatusToast('error', 'Failed to send notification');
    }
  }

  return (
    <>
      <div className="flex items-start gap-4 pl-[72px]">
        <div className="flex flex-col border-l border-[#eeeef0] p-8">
          <div className="flex items-center gap-2">
            <RiCheckboxCircleFill className="text-success h-3.5 w-3.5" />
            <span className="text-success text-sm font-medium">Amazing, you did it 🎉</span>
          </div>
          <p className="text-foreground-400 text-xs">Now, let the magic happen! Click send notification below.</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 pl-[72px]">
        <div className="relative border-l border-[#eeeef0] p-8 pt-[24px]">
          <div className="relative mt-8 flex gap-8 first:mt-0">
            <div className="absolute -left-[43px] flex h-5 w-5 items-center justify-center rounded-full bg-white">
              <RiLoader3Line className="h-4 w-4 text-neutral-300" />
            </div>

            <div className="flex gap-2">
              {/* Left section - existing content */}
              <div className="flex w-[350px] flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Let the magic happen 🪄</span>
                </div>
                <p className="text-foreground-400 text-xs">
                  Now, trigger a notification to see it pop up in your app! If it doesn't appear, double-check that the
                  subscriberId matches.
                </p>
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2 px-2"
                    onClick={handleSendNotification}
                    disabled={isPending || !hasValidApiKey}
                    isLoading={isPending}
                    leadingIcon={(props) => <Notification5Fill {...props} className="h-4 w-4" />}
                  >
                    Send notification
                  </Button>
                </div>
              </div>

              {/* Right section - curl code snippet */}
              <div className="flex w-[520px] flex-col gap-6">
                <div className="flex flex-col gap-0 rounded-xl bg-[rgba(14,18,27,0.9)] shadow-[inset_0px_0px_0px_1px_#18181B,inset_0px_0px_0px_1.5px_rgba(255,255,255,0.05)]">
                  {/* Header */}
                  <div className="flex h-10 items-center justify-between gap-3 px-4 py-2">
                    <span className="text-xs font-medium text-[#99A0AE]">Terminal</span>
                    {hasValidApiKey && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(curlCommand);
                          showStatusToast('success', 'Copied to clipboard!');
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-white/10"
                        aria-label="Copy curl command to clipboard"
                        title="Copy curl command to clipboard"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z"
                            stroke="#99A0AE"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5"
                            stroke="#99A0AE"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Code block */}
                  <div className="flex px-1 pb-1">
                    <div className="flex w-full gap-4 rounded-lg bg-[rgba(14,18,27,0.9)] p-3">
                      <span className="self-start text-xs text-[#525866]">❯</span>
                      <div className="flex-1">
                        {apiKeysQuery.isLoading ? (
                          <div className="flex items-center gap-2 text-xs text-[#99A0AE]">
                            <RiLoader3Line className="h-3 w-3 animate-spin" />
                            <span>Loading API key...</span>
                          </div>
                        ) : apiKeysQuery.error ? (
                          <div className="text-xs text-red-400">Error loading API key. Please refresh the page.</div>
                        ) : !apiKey ? (
                          <div className="text-xs text-[#99A0AE]">
                            No API key found. Please generate an API key first.
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap font-mono text-xs font-medium leading-4 text-white">
                            {curlCommand}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
