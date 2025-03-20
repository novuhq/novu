import { Separator } from '@/components/primitives/separator';
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
      <EmailTabsSection className="flex h-full flex-col gap-3">
        <div className={'flex h-9 items-center justify-between gap-2.5 text-sm font-medium'}>
          <div className="flex items-center gap-2.5">
            <span>Email template editor</span>
          </div>
          {disableOutputSanitization &&
            getComponentByType({
              component: disableOutputSanitization.component,
            })}
        </div>
        <div className="flex flex-1 flex-col gap-2 rounded-xl border border-neutral-100 p-2">
          <EmailPreviewHeader />
          <EmailTabsSection className="-mx-[2px] -my-[3px] px-7 py-2">
            {getComponentByType({ component: subject.component })}
          </EmailTabsSection>
          <Separator className="before:bg-neutral-100" />
          <EmailTabsSection className="flex-1 overflow-auto bg-neutral-50 pl-16 pr-16 pt-5">
            {getComponentByType({ component: body.component })}
          </EmailTabsSection>
        </div>
      </EmailTabsSection>
    </div>
  );
};
