import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { cn } from '@/utils/ui';
import { ChannelTypeEnum, StepResponseDto, StepTypeEnum, WorkflowOriginEnum, WorkflowResponseDto } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { SmsEditor } from '@/components/workflow-editor/steps/sms/sms-editor';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { ChatEditor } from '@/components/workflow-editor/steps/chat/chat-editor';
import { CustomStepControls } from '@/components/workflow-editor/steps/controls/custom-step-controls';
import { InboxPreview } from '@/components/workflow-editor/steps/in-app/inbox-preview';
import { SmsPreview } from '@/components/workflow-editor/steps/sms/sms-preview';
import { PushPreview } from '@/components/workflow-editor/steps/push/push-preview';
import { ChatPreview } from '@/components/workflow-editor/steps/chat/chat-preview';
import { useEditorPreview } from '@/components/workflow-editor/steps/use-editor-preview';
import { useFormContext } from 'react-hook-form';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/primitives/tabs';
import { RiMacLine, RiSmartphoneFill } from 'react-icons/ri';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  EmailPreviewBody,
  EmailPreviewBodyMobile,
  EmailPreviewContentMobile,
  EmailPreviewSubject,
  EmailPreviewSubjectMobile,
} from '@/components/workflow-editor/steps/email/email-preview';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  previewContextContent?: React.ReactNode;
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

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

function EmailCorePreview({ previewData, isPreviewPending }: { previewData: any; isPreviewPending: boolean }) {
  const [activeTab, setActiveTab] = useState('desktop');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
      <div className="flex w-full items-center justify-center pb-2 pt-2">
        <TabsList>
          <TabsTrigger value="mobile">
            <RiSmartphoneFill className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="desktop">
            <RiMacLine className="size-4" />
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="flex flex-col">
        <AnimatePresence mode="wait">
          {isPreviewPending ? (
            <motion.div
              key="loading"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <div className="flex flex-col">
                <div className="border-b px-4 py-1.5">
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="bg-neutral-50 py-4">
                  <Skeleton className="mx-auto h-96 max-w-[600px] rounded-lg" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {previewData?.result?.type == ChannelTypeEnum.EMAIL ? (
                <>
                  <TabsContent value="mobile">
                    <div className="w-full bg-neutral-100">
                      <EmailPreviewContentMobile className="mx-auto">
                        <EmailPreviewSubjectMobile subject={previewData.result.preview.subject} />
                        <EmailPreviewBodyMobile body={previewData.result.preview.body} />
                      </EmailPreviewContentMobile>
                    </div>
                  </TabsContent>
                  <TabsContent value="desktop" className="h-full">
                    <div className="border-b px-2">
                      <EmailPreviewSubject subject={previewData.result.preview.subject} />
                    </div>
                    <div className="bg-neutral-50 px-16 py-8">
                      <EmailPreviewBody body={previewData.result.preview.body} className="bg-background rounded-lg" />
                    </div>
                  </TabsContent>
                </>
              ) : (
                <div className="p-6">No preview available</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Tabs>
  );
}

function getCorePreviewContent(step: StepResponseDto, previewData: any, isPreviewPending: boolean) {
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
      return <SmsPreview {...commonProps} />;
    case StepTypeEnum.PUSH:
      return <PushPreview {...commonProps} />;
    case StepTypeEnum.CHAT:
      return <ChatPreview {...commonProps} />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Preview not implemented for {STEP_TYPE_LABELS[step.type]} steps
        </div>
      );
  }
}

export function StepEditorLayout({ workflow, step, previewContextContent, className }: StepEditorLayoutProps) {
  const form = useFormContext();
  const editorTitle = getEditorTitle(step.type);
  const editorContent = getEditorContent(workflow, step);

  const { previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues: form.getValues(),
  });

  const { uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;

  const previewContent = isNovuCloud ? (
    getCorePreviewContent(step, previewData, isPreviewPending)
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Preview not available for this step configuration
    </div>
  );

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
            <div className="flex-1 overflow-y-auto">{previewContent}</div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
