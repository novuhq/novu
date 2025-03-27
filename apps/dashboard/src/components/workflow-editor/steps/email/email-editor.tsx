import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { UiSchemaGroupEnum, type UiSchema } from '@novu/shared';

type EmailEditorProps = { uiSchema: UiSchema };

export const EmailEditor = (props: EmailEditorProps) => {
  const { uiSchema } = props;

  if (uiSchema.group !== UiSchemaGroupEnum.EMAIL) {
    return null;
  }

  const { body, subject, disableOutputSanitization } = uiSchema.properties ?? {};

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 pb-0 pt-4">
        <EmailPreviewHeader>
          {disableOutputSanitization &&
            getComponentByType({
              component: disableOutputSanitization.component,
            })}
        </EmailPreviewHeader>
        {getComponentByType({ component: subject.component })}
      </div>
      <div className="relative flex-1 overflow-y-auto bg-neutral-50 px-16 pt-8">
        {getComponentByType({ component: body.component })}
      </div>
    </div>
  );
};
