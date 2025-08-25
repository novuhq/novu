import { ResourceOriginEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { EmailCorePreview } from '../workflow-editor/steps/preview/previews/email-preview-wrapper';
import { useLayoutEditor } from './layout-editor-provider';

export const LayoutPreviewFactory = () => {
  const { layout, isPreviewPending, previewData } = useLayoutEditor();
  const form = useFormContext();
  const editorType = form.getValues('editorType');

  return (
    <EmailCorePreview
      isPreviewPending={isPreviewPending}
      previewData={previewData}
      isCustomHtmlEditor={editorType === 'html'}
      resourceOrigin={layout?.origin ?? ResourceOriginEnum.NOVU_CLOUD}
    />
  );
};
