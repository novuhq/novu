import { useLayoutEditor } from './layout-editor-provider';
import { EmailCorePreview } from '../workflow-editor/steps/preview/previews/email-preview-wrapper';

export const LayoutPreviewFactory = () => {
  const { layout, isPreviewPending, previewData } = useLayoutEditor();

  return (
    <EmailCorePreview
      isPreviewPending={isPreviewPending}
      previewData={previewData}
      controlValues={layout?.controls.values.email as Record<string, unknown>}
    />
  );
};
