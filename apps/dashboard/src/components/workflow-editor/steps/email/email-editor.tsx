import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { EmailTabsSection } from '@/components/workflow-editor/steps/email/email-tabs-section';
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
      <EmailTabsSection>
        <EmailPreviewHeader>
          {disableOutputSanitization &&
            getComponentByType({
              component: disableOutputSanitization.component,
            })}
        </EmailPreviewHeader>
      </EmailTabsSection>
      <EmailTabsSection className="-mx-[2px] -my-[3px] px-7 py-2">
        {getComponentByType({ component: subject.component })}
      </EmailTabsSection>
      <EmailTabsSection className="flex-1 overflow-auto bg-neutral-50 pl-16 pr-16 pt-5">
        {getComponentByType({ component: body.component })}
      </EmailTabsSection>
    </div>
  );
};
