import { FeatureFlagsKeysEnum, UiComponentEnum, UiSchemaGroupEnum, type UiSchema } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { cn } from '../../../../utils/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type EmailEditorProps = { uiSchema: UiSchema; isEditorV2?: boolean };

export const EmailEditor = (props: EmailEditorProps) => {
  const { uiSchema, isEditorV2 = false } = props;
  const isHtmlEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED);

  if (uiSchema.group !== UiSchemaGroupEnum.EMAIL) {
    return null;
  }

  const { body, subject, disableOutputSanitization, editorType } = uiSchema.properties ?? {};

  return (
    <div className="flex h-full flex-col">
      <div className={cn('px-4 pb-0 pt-4', isEditorV2 && 'px-0 pt-0')}>
        <div className={cn(isEditorV2 && 'border-b border-neutral-200 px-3 py-2')}>
          <EmailPreviewHeader minimalHeader={isEditorV2}>
            {disableOutputSanitization &&
              getComponentByType({
                component: disableOutputSanitization.component,
              })}
            {isHtmlEditorEnabled &&
              getComponentByType({ component: editorType?.component ?? UiComponentEnum.EMAIL_EDITOR_SELECT })}
          </EmailPreviewHeader>
        </div>

        <div className={cn(isEditorV2 && 'px-3 py-0')}>{getComponentByType({ component: subject.component })}</div>
      </div>
      <div className="relative h-full flex-1 overflow-y-auto bg-neutral-50 px-16 pt-8">
        {getComponentByType({ component: body.component })}
      </div>
    </div>
  );
};
