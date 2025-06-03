import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { cn } from '@/utils/ui';
import { StepResponseDto, StepTypeEnum, WorkflowOriginEnum, WorkflowResponseDto } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { SmsEditor } from '@/components/workflow-editor/steps/sms/sms-editor';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { ChatEditor } from '@/components/workflow-editor/steps/chat/chat-editor';
import { CustomStepControls } from '@/components/workflow-editor/steps/controls/custom-step-controls';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  previewContextContent?: React.ReactNode;
  previewContent?: React.ReactNode;
  className?: string;
};

function getEditorTitle(stepType: StepTypeEnum): string {
  const label = STEP_TYPE_LABELS[stepType];
  return `${label} Editor`;
}

function getEditorContent(workflow: WorkflowResponseDto, step: StepResponseDto) {
  const { dataSchema, uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;

  if (isExternal) {
    return <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />;
  }

  if (!isNovuCloud || !uiSchema) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        No editor available for this step configuration
      </div>
    );
  }

  switch (step.type) {
    case StepTypeEnum.EMAIL:
      return <EmailEditor uiSchema={uiSchema} />;
    case StepTypeEnum.IN_APP:
      return <InAppEditor uiSchema={uiSchema} />;
    case StepTypeEnum.SMS:
      return <SmsEditor uiSchema={uiSchema} />;
    case StepTypeEnum.PUSH:
      return <PushEditor uiSchema={uiSchema} />;
    case StepTypeEnum.CHAT:
      return <ChatEditor uiSchema={uiSchema} />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Editor not implemented for {STEP_TYPE_LABELS[step.type]} steps
        </div>
      );
  }
}

export function StepEditorLayout({
  workflow,
  step,
  previewContextContent,
  previewContent,
  className,
}: StepEditorLayoutProps) {
  const editorTitle = getEditorTitle(step.type);
  const editorContent = getEditorContent(workflow, step);

  return (
    <div className={cn('h-full w-full', className)}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full">
          <div className="flex h-full flex-col border-r border-neutral-200">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-sm font-medium text-neutral-900">Preview Context</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {previewContextContent || (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Preview context content will go here
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="group relative w-px bg-transparent transition-colors duration-200 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-neutral-300">
          <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </ResizableHandle>

        <ResizablePanel defaultSize={50} minSize={30} className="h-full">
          <div className="flex h-full flex-col border-r border-neutral-200">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-sm font-medium text-neutral-900">{editorTitle}</h3>
            </div>
            <div className="flex-1 overflow-y-auto">{editorContent}</div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="group relative w-px bg-transparent transition-colors duration-200 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-neutral-300">
          <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </ResizableHandle>

        <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full">
          <div className="flex h-full flex-col">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-sm font-medium text-neutral-900">Preview</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {previewContent || (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Preview content will go here
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
