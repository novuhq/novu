import { StepTypeEnum } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { EmailCorePreview } from './previews/email-preview-wrapper';
import { InboxPreview } from '@/components/workflow-editor/steps/in-app/inbox-preview';
import { SmsPreview } from '@/components/workflow-editor/steps/sms/sms-preview';
import { PushPreview } from '@/components/workflow-editor/steps/push/push-preview';
import { ChatPreview } from '@/components/workflow-editor/steps/chat/chat-preview';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';

function NoPreviewAvailable({ stepType }: { stepType: StepTypeEnum }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Preview not implemented for {STEP_TYPE_LABELS[stepType]} steps
    </div>
  );
}

export function StepPreviewFactory() {
  const { step, previewData, isPreviewPending, isStepPreviewable } = useStepEditor();

  if (!isStepPreviewable) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Preview not available for this step configuration
      </div>
    );
  }

  const commonProps = {
    previewData,
    isPreviewPending,
  };

  switch (step.type) {
    case StepTypeEnum.EMAIL:
      return <EmailCorePreview {...commonProps} />;

    case StepTypeEnum.IN_APP:
      return <InboxPreview {...commonProps} />;

    case StepTypeEnum.SMS:
      return (
        <div className="flex flex-col items-center justify-center">
          <SmsPreview {...commonProps} />
          <InlineToast
            description="This preview shows how your message will appear on mobile. Actual rendering may vary by device."
            className="w-full px-3"
          />
        </div>
      );

    case StepTypeEnum.PUSH:
      return (
        <div className="flex flex-col items-center justify-center">
          <PushPreview {...commonProps} />
          <InlineToast
            description="This preview shows how your message will appear on mobile. Actual rendering may vary by device."
            className="w-full px-3"
          />
        </div>
      );

    case StepTypeEnum.CHAT:
      return <ChatPreview {...commonProps} />;

    default:
      return <NoPreviewAvailable stepType={step.type} />;
  }
}
