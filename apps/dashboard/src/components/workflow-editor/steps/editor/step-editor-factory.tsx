import { StepResponseDto, StepTypeEnum, WorkflowOriginEnum, WorkflowResponseDto } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { SmsEditor } from '@/components/workflow-editor/steps/sms/sms-editor';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { ChatEditor } from '@/components/workflow-editor/steps/chat/chat-editor';
import { CustomStepControls } from '@/components/workflow-editor/steps/controls/custom-step-controls';

type StepEditorFactoryProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
};

function NoEditorAvailable({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-neutral-500">{message}</div>;
}

export function StepEditorFactory({ workflow, step }: StepEditorFactoryProps) {
  const { dataSchema, uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;

  if (isExternal) {
    return <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />;
  }

  if (!isNovuCloud || !uiSchema) {
    return <NoEditorAvailable message="No editor available for this step configuration" />;
  }

  switch (step.type) {
    case StepTypeEnum.EMAIL:
      return (
        <div className="border-soft-200 h-full overflow-auto rounded-lg border shadow-lg">
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

    default:
      return <NoEditorAvailable message={`Editor not implemented for ${STEP_TYPE_LABELS[step.type]} steps`} />;
  }
}
