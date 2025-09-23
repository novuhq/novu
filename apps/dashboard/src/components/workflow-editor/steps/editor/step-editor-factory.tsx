import { ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { ChatEditor } from '@/components/workflow-editor/steps/chat/chat-editor';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { CustomStepControls } from '@/components/workflow-editor/steps/controls/custom-step-controls';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { SmsEditor } from '@/components/workflow-editor/steps/sms/sms-editor';
import { ThrottleEditor } from '@/components/workflow-editor/steps/throttle/throttle-editor';
import { STEP_TYPE_LABELS } from '@/utils/constants';

function NoEditorAvailable({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-neutral-500">{message}</div>;
}

export function StepEditorFactory() {
  const { workflow, step, isStepEditable } = useStepEditor();
  const { dataSchema, uiSchema } = step.controls || {};

  if (!isStepEditable) {
    return <NoEditorAvailable message="No editor available for this step configuration" />;
  }

  if (workflow.origin === ResourceOriginEnum.EXTERNAL) {
    return <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />;
  }

  if (!uiSchema) {
    return <NoEditorAvailable message="No editor configuration available" />;
  }

  switch (step.type) {
    case StepTypeEnum.EMAIL:
      return (
        <div className="border-soft-200 h-full overflow-hidden rounded-lg border shadow-lg">
          <EmailEditor uiSchema={uiSchema} isEditorV2={true} />
        </div>
      );

    case StepTypeEnum.IN_APP:
      return <InAppEditor uiSchema={uiSchema} />;

    case StepTypeEnum.SMS:
      return <SmsEditor uiSchema={uiSchema} />;

    case StepTypeEnum.PUSH:
      return <PushEditor uiSchema={uiSchema} />;

    case StepTypeEnum.CHAT:
      return <ChatEditor uiSchema={uiSchema} />;

    case StepTypeEnum.THROTTLE:
      return <ThrottleEditor />;

    default:
      return <NoEditorAvailable message={`Editor not implemented for ${STEP_TYPE_LABELS[step.type]} steps`} />;
  }
}
