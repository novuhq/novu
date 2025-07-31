import { ChannelTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { HTMLAttributes, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  InAppPreview,
  InAppPreviewAvatar,
  InAppPreviewBody,
  InAppPreviewHeader,
  InAppPreviewNotification,
  InAppPreviewNotificationContent,
  InAppPreviewSubject,
} from '@/components/workflow-editor/in-app-preview';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { usePreviewStep } from '@/hooks/use-preview-step';

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

  if (isPreviewPending || previewData === undefined) {
    return (
      <InAppPreview {...props}>
        <InAppPreviewHeader />
        <InAppPreviewNotification>
          <InAppPreviewAvatar isPending />
          <InAppPreviewNotificationContent>
            <InAppPreviewSubject isPending />
            <InAppPreviewBody isPending className="line-clamp-2" />
          </InAppPreviewNotificationContent>
        </InAppPreviewNotification>
      </InAppPreview>
    );
  }

  if (previewResult?.type === undefined || previewResult?.type !== ChannelTypeEnum.IN_APP) {
    return (
      <InAppPreview {...props}>
        <InAppPreviewHeader />
        <InAppPreviewNotification className="flex-1 items-center">
          <InAppPreviewNotificationContent className="my-auto">
            <InAppPreviewBody className="mb-4 text-center">No preview available</InAppPreviewBody>
          </InAppPreviewNotificationContent>
        </InAppPreviewNotification>
      </InAppPreview>
    );
  }

  const preview = previewResult.preview;

  return (
    <InAppPreview {...props}>
      <InAppPreviewHeader />
      <InAppPreviewNotification>
        <InAppPreviewAvatar src={preview?.avatar} />
        <InAppPreviewNotificationContent>
          <InAppPreviewSubject>{preview?.subject}</InAppPreviewSubject>
          <InAppPreviewBody className="line-clamp-2">{preview?.body}</InAppPreviewBody>
        </InAppPreviewNotificationContent>
      </InAppPreviewNotification>
    </InAppPreview>
  );
};
