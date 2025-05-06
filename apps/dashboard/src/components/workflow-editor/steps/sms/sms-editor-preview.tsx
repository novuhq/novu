import { Sms } from '@/components/icons';
import { InlineToast } from '@/components/primitives/inline-toast';
import { SmsPreview } from '@/components/workflow-editor/steps/sms/sms-preview';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { GeneratePreviewResponseDto } from '@novu/shared';
import { ConfigurePreviewAccordion } from '../shared/configure-preview-accordion';

type SmsEditorPreviewProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewStep: () => void;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
};

export const SmsEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending = false,
}: SmsEditorPreviewProps) => {
  return (
    <TabsSection>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Sms className="size-3" />
          SMS template editor
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          <SmsPreview isPreviewPending={isPreviewPending} previewData={previewData} />
          <InlineToast
            description="This preview shows how your message will appear on mobile. Actual rendering may vary by device."
            className="w-full px-3"
          />
        </div>
        <ConfigurePreviewAccordion editorValue={editorValue} setEditorValue={setEditorValue} onUpdate={previewStep} />
      </div>
    </TabsSection>
  );
};
