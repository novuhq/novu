import { useEnvironment } from '@/context/environment/hooks';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { zodResolver } from '@hookform/resolvers/zod';
import { IEnvironment, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiNotification2Fill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createWorkflow } from '../../api/workflows';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../../config';
import { useAuth } from '../../context/auth/hooks';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { useTelemetry } from '../../hooks/use-telemetry';
import { ROUTES } from '../../utils/routes';
import { TelemetryEvent } from '../../utils/telemetry';
import { Button } from '../primitives/button';
import { InlineToast } from '../primitives/inline-toast';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { UsecasePlaygroundHeader } from '../usecase-playground-header';
import { CustomizeInbox } from './customize-inbox-playground';
import { InboxPreviewContent } from './inbox-preview-content';

export interface ActionConfig {
  label: string;
  redirect: {
    target: string;
    url: string;
  };
}

export interface InboxPlaygroundFormData {
  subject: string;
  body: string;
  primaryColor: string;
  foregroundColor: string;
  selectedStyle: string;
  openAccordion?: string;
  primaryAction: ActionConfig;
  secondaryAction: ActionConfig | null;
}

const formSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
  primaryColor: z.string(),
  foregroundColor: z.string(),
  selectedStyle: z.string(),
  openAccordion: z.string().optional(),
  primaryAction: z.object({
    label: z.string(),
    redirect: z.object({
      target: z.string(),
      url: z.string(),
    }),
  }),
  secondaryAction: z
    .object({
      label: z.string(),
      redirect: z.object({
        target: z.string(),
        url: z.string(),
      }),
    })
    .nullable(),
});

const defaultFormValues: InboxPlaygroundFormData = {
  subject: '**Welcome to Inbox!**',
  body: 'This is your first notification. Customize and explore more features.',
  primaryColor: '#DD2450',
  foregroundColor: '#0E121B',
  selectedStyle: 'popover',
  openAccordion: 'layout',
  primaryAction: {
    label: 'Add to your app',
    redirect: {
      target: '_self',
      url: '/onboarding/inbox/embed',
    },
  },
  secondaryAction: null,
};

export function InboxPlayground() {
  const { currentEnvironment } = useEnvironment();
  const form = useForm<InboxPlaygroundFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
    shouldFocusError: true,
  });

  const { triggerWorkflow, isPending } = useTriggerWorkflow();
  const { data } = useFetchWorkflows({ query: ONBOARDING_DEMO_WORKFLOW_ID });
  const auth = useAuth();
  const [hasNotificationBeenSent, setHasNotificationBeenSent] = useState(false);
  const navigate = useNavigate();
  const telemetry = useTelemetry();

  useEffect(() => {
    if (!data) return;

    /**
     * We only want to create the demo workflow if it doesn't exist yet.
     * This workflow will be used by the inbox preview examples
     */
    const initializeDemoWorkflow = async () => {
      const workflow = data?.workflows.find((workflow) => workflow.workflowId?.includes(ONBOARDING_DEMO_WORKFLOW_ID));
      if (!workflow) {
        await createDemoWorkflow({ environment: currentEnvironment! });
      }
    };

    initializeDemoWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleSendNotification = async () => {
    try {
      const formValues = form.getValues();

      await triggerWorkflow({
        name: ONBOARDING_DEMO_WORKFLOW_ID,
        to: auth.currentUser?._id,
        payload: {
          subject: formValues.subject,
          body: formValues.body,
          primaryActionLabel: formValues.primaryAction?.label || '',
          secondaryActionLabel: formValues.secondaryAction?.label || '',
        },
      });

      telemetry(TelemetryEvent.INBOX_NOTIFICATION_SENT, {
        subject: formValues.subject,
        hasSecondaryAction: !!formValues.secondaryAction,
      });

      setHasNotificationBeenSent(true);
      showSuccessToast('Notification sent successfully!');
    } catch (error) {
      showErrorToast('Failed to send notification');
    }
  };

  const handleImplementClick = () => {
    const { primaryColor, foregroundColor } = form.getValues();
    telemetry(TelemetryEvent.INBOX_IMPLEMENTATION_CLICKED, {
      primaryColor,
      foregroundColor,
    });
    const queryParams = new URLSearchParams({ primaryColor, foregroundColor }).toString();
    navigate(`${ROUTES.INBOX_EMBED}?${queryParams}`);
  };

  const handleSkipToDashboard = () => {
    telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
      skippedFrom: 'inbox-playground',
    });
    navigate(ROUTES.WELCOME);
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'selectedStyle') {
        telemetry(TelemetryEvent.INBOX_PREVIEW_STYLE_CHANGED, {
          style: value.selectedStyle,
        });
      }

      if (['primaryColor', 'foregroundColor', 'subject', 'body'].includes(name || '')) {
        telemetry(TelemetryEvent.INBOX_CUSTOMIZATION_CHANGED, {
          field: name,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, telemetry]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <UsecasePlaygroundHeader
        title="Send your first Inbox notification"
        description="Customize your notification and hit 'Send notification' 🎉"
        skipPath={ROUTES.WELCOME}
        onSkip={() =>
          telemetry(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
            skippedFrom: 'inbox-playground',
          })
        }
      />

      <div className="flex flex-1">
        <div className="flex min-w-[480px] flex-col">
          <CustomizeInbox form={form} />

          {hasNotificationBeenSent && (
            <div className="px-3">
              <InlineToast
                variant="tip"
                title="Send Again?"
                description="Edit the notification and resend"
                ctaLabel="Send again"
                onCtaClick={handleSendNotification}
                isCtaLoading={isPending}
              />
            </div>
          )}

          <div className="bg-muted mt-auto border-t">
            <div className="flex justify-end gap-3 p-2">
              {!hasNotificationBeenSent ? (
                <Button
                  variant="secondary"
                  size="xs"
                  trailingIcon={RiNotification2Fill}
                  isLoading={isPending}
                  onClick={handleSendNotification}
                  disabled={isPending}
                >
                  Send notification
                </Button>
              ) : (
                <>
                  <Button size="xs" variant="secondary" mode="ghost" className="px-2" onClick={handleSkipToDashboard}>
                    Skip to Dashboard
                  </Button>
                  <Button size="xs" variant="secondary" onClick={handleImplementClick}>
                    Implement &lt;Inbox /&gt;
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[610px] w-full border-l">
          <InboxPreviewContent
            hasNotificationBeenSent={hasNotificationBeenSent}
            selectedStyle={form.watch('selectedStyle')}
            primaryColor={form.watch('primaryColor')}
            foregroundColor={form.watch('foregroundColor')}
          />
        </div>
      </div>
    </div>
  );
}

async function createDemoWorkflow({ environment }: { environment: IEnvironment }) {
  await createWorkflow({
    environment,
    workflow: {
      name: 'Onboarding Demo Workflow',
      description: 'A demo workflow to showcase the Inbox component',
      workflowId: ONBOARDING_DEMO_WORKFLOW_ID,
      steps: [
        {
          name: 'Inbox',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            subject: '{{payload.subject}}',
            body: '{{payload.body}}',
            avatar: window.location.origin + '/images/novu.svg',
            primaryAction: {
              label: '{{payload.primaryActionLabel}}',
              redirect: {
                target: '_self',
                url: '/onboarding/inbox/embed',
              },
            },
            secondaryAction: {
              label: '{{payload.secondaryActionLabel}}',
              redirect: {
                target: '_self',
                url: '/onboarding/inbox/embed',
              },
            },
          },
        },
      ],
      __source: WorkflowCreationSourceEnum.DASHBOARD,
    },
  });
}
