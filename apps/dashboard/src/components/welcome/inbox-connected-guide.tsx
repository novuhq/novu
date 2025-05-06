import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { IEnvironment } from '@novu/shared';
import { RiCheckboxCircleFill, RiLoader3Line, RiNotification2Fill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../../config';
import { ROUTES } from '../../utils/routes';
import { Button } from '../primitives/button';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';

type InboxConnectedGuideProps = {
  subscriberId: string;
  environment: IEnvironment;
};

export function InboxConnectedGuide({ subscriberId, environment }: InboxConnectedGuideProps) {
  const navigate = useNavigate();
  const { triggerWorkflow, isPending } = useTriggerWorkflow(environment);

  async function handleSendNotification() {
    try {
      await triggerWorkflow({
        name: ONBOARDING_DEMO_WORKFLOW_ID,
        to: subscriberId,
        payload: {
          subject: '**Welcome to Inbox!**',
          body: 'This is your first notification. Customize and explore more features.',
          primaryActionLabel: 'Add to your app',
          secondaryActionLabel: '',
        },
      });

      showSuccessToast('Notification sent successfully!');
      navigate(ROUTES.INBOX_EMBED_SUCCESS);
    } catch (error) {
      showErrorToast('Failed to send notification');
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

            <div className="flex w-[344px] max-w-md flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Let the magic happen 🪄</span>
              </div>
              <p className="text-foreground-400 text-xs">
                Now, trigger a notification to see it pop up in your app! If it doesn't appear, double-check that the
                subscriberId matches as above.
              </p>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1 px-2"
                  onClick={handleSendNotification}
                  disabled={isPending}
                  isLoading={isPending}
                  trailingIcon={RiNotification2Fill}
                >
                  Send notification
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
