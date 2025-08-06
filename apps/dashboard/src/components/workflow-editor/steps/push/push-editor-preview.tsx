import { GeneratePreviewResponseDto, type WorkflowResponseDto } from '@novu/shared';
import { InlineToast } from '@/components/primitives/inline-toast';
import { PushPreview } from '@/components/workflow-editor/steps/push/push-preview';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { ConfigurePreviewAccordion } from '../shared/configure-preview-accordion';

type PushEditorPreviewProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewStep: () => void;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
  workflow?: WorkflowResponseDto;
};

export const PushEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending,
  workflow,
}: PushEditorPreviewProps) => {
  return (
    <TabsSection>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2.5 pb-2 text-sm font-medium">
          <span>Push template editor</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          <PushPreview isPreviewPending={isPreviewPending} previewData={previewData} />
          <InlineToast
            description="This preview shows how your message will appear on mobile. Actual rendering may vary by device."
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
