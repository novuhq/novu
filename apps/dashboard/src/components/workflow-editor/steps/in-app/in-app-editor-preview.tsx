import { GeneratePreviewResponseDto, type WorkflowResponseDto } from '@novu/shared';
import { Notification5Fill } from '@/components/icons';
import { InAppTabsSection } from '@/components/workflow-editor/steps/in-app/in-app-tabs-section';
import { ConfigurePreviewAccordion } from '../shared/configure-preview-accordion';
import { InboxPreview } from './inbox-preview';

type InAppEditorPreviewProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewStep: () => void;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
  workflow?: WorkflowResponseDto;
};

export const InAppEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending = false,
  workflow,
}: InAppEditorPreviewProps) => {
  return (
    <InAppTabsSection>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Notification5Fill className="size-3" />
          In-App template editor
        </div>
        <InboxPreview isPreviewPending={isPreviewPending} previewData={previewData} />
        <ConfigurePreviewAccordion
          schema={(previewData as any)?.schema}
          editorValue={editorValue}
          setEditorValue={setEditorValue}
          onUpdate={previewStep}
          workflow={workflow}
        />
      </div>
    </InAppTabsSection>
  );
};
