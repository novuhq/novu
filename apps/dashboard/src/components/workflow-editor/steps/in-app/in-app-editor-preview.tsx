import { Notification5Fill } from '@/components/icons';
import { InAppTabsSection } from '@/components/workflow-editor/steps/in-app/in-app-tabs-section';
import { GeneratePreviewResponseDto } from '@novu/shared';
import { ConfigurePreviewAccordion } from '../shared/configure-preview-accordion';
import { InboxPreview } from './inbox-preview';

type InAppEditorPreviewProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewStep: () => void;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
};

export const InAppEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending = false,
}: InAppEditorPreviewProps) => {
  return (
    <InAppTabsSection>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Notification5Fill className="size-3" />
          In-App template editor
        </div>
        <InboxPreview isPreviewPending={isPreviewPending} previewData={previewData} />
        <ConfigurePreviewAccordion editorValue={editorValue} setEditorValue={setEditorValue} onUpdate={previewStep} />
      </div>
    </InAppTabsSection>
  );
};
