import { ChannelTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { HTMLAttributes, ReactNode, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  InAppPreview,
  InAppPreviewActions,
  InAppPreviewAvatar,
  InAppPreviewBody,
  InAppPreviewHeader,
  InAppPreviewNotification,
  InAppPreviewNotificationContent,
  InAppPreviewPrimaryAction,
  InAppPreviewSecondaryAction,
  InAppPreviewSubject,
} from '@/components/workflow-editor/in-app-preview';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { usePreviewStep } from '@/hooks/use-preview-step';
import { cn } from '@/utils/ui';

type ConfigureInAppStepPreviewProps = HTMLAttributes<HTMLDivElement>;

export const ConfigureInAppStepPreview = (props: ConfigureInAppStepPreviewProps) => {
  const {
    previewStep,
    data: previewData,
    isPending: isPreviewPending,
  } = usePreviewStep({
    onError: (error) => {
      Sentry.captureException(error);
    },
  });
  const { step, isPending } = useWorkflow();

  const { workflowSlug, stepSlug } = useParams<{
    workflowSlug: string;
    stepSlug: string;
  }>();

  useEffect(() => {
    if (!workflowSlug || !stepSlug || !step || isPending) return;

    previewStep({
      workflowSlug,
      stepSlug,
      previewData: { controlValues: step.controls.values, previewPayload: {} },
    });
  }, [workflowSlug, stepSlug, previewStep, step, isPending]);

  const previewResult = previewData?.result;
  let notificationContent: ReactNode = null;

  const notificationShellClass = 'gap-2 p-3';
  const actionsClass = 'mt-2';

  if (isPreviewPending || previewData === undefined) {
    notificationContent = (
      <InAppPreviewNotification className={notificationShellClass}>
        <InAppPreviewAvatar isPending />
        <InAppPreviewNotificationContent>
          <InAppPreviewSubject isPending />
          <InAppPreviewBody isPending className="line-clamp-2" />
          <InAppPreviewActions className={actionsClass}>
            <InAppPreviewPrimaryAction isPending />
            <InAppPreviewSecondaryAction isPending />
          </InAppPreviewActions>
        </InAppPreviewNotificationContent>
      </InAppPreviewNotification>
    );
  } else if (previewResult?.type === undefined || previewResult?.type !== ChannelTypeEnum.IN_APP) {
    notificationContent = (
      <InAppPreviewNotification className={cn(notificationShellClass, 'flex-1 items-center')}>
        <InAppPreviewNotificationContent className="my-auto">
          <InAppPreviewBody className="mb-2 text-center">No preview available</InAppPreviewBody>
        </InAppPreviewNotificationContent>
      </InAppPreviewNotification>
    );
  } else {
    notificationContent = (
      <InAppPreviewNotification className={notificationShellClass}>
        <InAppPreviewAvatar src={previewResult.preview?.avatar} />
        <InAppPreviewNotificationContent>
          <InAppPreviewSubject>{previewResult.preview?.subject}</InAppPreviewSubject>
          <InAppPreviewBody className="line-clamp-2">{previewResult.preview?.body}</InAppPreviewBody>
          <InAppPreviewActions className={actionsClass}>
            <InAppPreviewPrimaryAction>{previewResult.preview?.primaryAction?.label}</InAppPreviewPrimaryAction>
            <InAppPreviewSecondaryAction>{previewResult.preview?.secondaryAction?.label}</InAppPreviewSecondaryAction>
          </InAppPreviewActions>
        </InAppPreviewNotificationContent>
      </InAppPreviewNotification>
    );
  }

  return (
    <div {...props}>
      <div className="relative w-full overflow-hidden rounded-xl">
        <InAppPreview className="mx-0 h-auto min-h-48 w-full max-w-none border border-solid border-neutral-alpha-200 bg-bg-white shadow-xs">
          <InAppPreviewHeader />
          {notificationContent}
        </InAppPreview>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 rounded-b-xl bg-linear-to-b from-transparent via-bg-white/70 to-bg-white"
          aria-hidden
        />
      </div>
    </div>
  );
};
