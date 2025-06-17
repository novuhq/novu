import { memo } from 'react';
import { StepTypeEnum } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { EmailCorePreview } from './previews/email-preview-wrapper';
import { InboxPreview } from '@/components/workflow-editor/steps/in-app/inbox-preview';
import { SmsPreview } from '@/components/workflow-editor/steps/sms/sms-preview';
import { PushPreview } from '@/components/workflow-editor/steps/push/push-preview';
import { ChatPreview } from '@/components/workflow-editor/steps/chat/chat-preview';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';

const NoPreviewAvailable = memo(({ stepType }: { stepType: StepTypeEnum }) => {
  return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Preview not implemented for {STEP_TYPE_LABELS[stepType]} steps
    </div>
  );
});

const UnavailablePreview = memo(() => {
  return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Preview not available for this step configuration
    </div>
  );
});

// Memoize mobile preview wrappers to prevent unnecessary re-renders
const MobilePreviewWrapper = memo(({ children, description }: { children: React.ReactNode; description: string }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      {children}
      <InlineToast description={description} className="w-full px-3" />
    </div>
  );
});

export function StepPreviewFactory() {
  const { step, previewData, isInitialLoad, controlValues } = useStepEditor();

  const commonProps = {
    previewData: previewData ?? undefined,
    isPreviewPending: isInitialLoad,
  };

  const mobilePreviewDescription =
    'This preview shows how your message will appear on mobile. Actual rendering may vary by device.';

  switch (step.type) {
    case StepTypeEnum.EMAIL:
      return <EmailCorePreview {...commonProps} controlValues={controlValues} />;

    case StepTypeEnum.IN_APP:
      return <InboxPreview {...commonProps} />;

    case StepTypeEnum.SMS:
      return (
        <MobilePreviewWrapper description={mobilePreviewDescription}>
          <SmsPreview {...commonProps} />
        </MobilePreviewWrapper>
      );

    case StepTypeEnum.PUSH:
      return (
        <MobilePreviewWrapper description={mobilePreviewDescription}>
          <PushPreview {...commonProps} />
        </MobilePreviewWrapper>
      );

    case StepTypeEnum.CHAT:
      return <ChatPreview {...commonProps} />;

    default:
      return <NoPreviewAvailable stepType={step.type} />;
  }
}
