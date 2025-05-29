import { GeneratePreviewResponseDto, type WorkflowResponseDto } from '@novu/shared';

import { InlineToast } from '@/components/primitives/inline-toast';
import { ChatPreview } from '@/components/workflow-editor/steps/chat/chat-preview';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { ConfigurePreviewAccordion } from '../shared/configure-preview-accordion';

type ChatEditorPreviewProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewStep: () => void;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
  workflow?: WorkflowResponseDto;
};

export const ChatEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending = false,
  workflow,
}: ChatEditorPreviewProps) => {
  return (
    <TabsSection>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-sm font-medium">Chat template editor</div>
        <div className="flex flex-col items-center justify-center gap-4">
          <ChatPreview isPreviewPending={isPreviewPending} previewData={previewData} />
          <InlineToast
            description="This preview shows how your message will appear. Actual rendering may vary by provider."
            className="w-full px-3"
          />
        </div>
        <ConfigurePreviewAccordion
          schema={(previewData as any)?.schema}
          editorValue={editorValue}
          setEditorValue={setEditorValue}
          onUpdate={previewStep}
          workflow={workflow}
        />
      </div>
    </TabsSection>
  );
};
