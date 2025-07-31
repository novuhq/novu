import { UiComponentEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { getLayoutComponentByType } from './component-utils';

type EmailEditorProps = { uiSchema: UiSchema };

export const LayoutEmailEditor = (props: EmailEditorProps) => {
  const { uiSchema } = props;

  if (uiSchema.group !== UiSchemaGroupEnum.LAYOUT) {
    return null;
  }

  const { body, editorType } = uiSchema.properties?.email?.properties ?? {};

  return (
    <div className="flex h-full flex-col">
      <div className="px-0 pb-0 pt-0">
        <div className="border-b border-neutral-200 px-3 py-2">
          <EmailPreviewHeader minimalHeader>
            {getLayoutComponentByType({ component: editorType?.component ?? UiComponentEnum.EMAIL_EDITOR_SELECT })}
          </EmailPreviewHeader>
        </div>
      </div>
      {getLayoutComponentByType({ component: body.component })}
    </div>
  );
};
