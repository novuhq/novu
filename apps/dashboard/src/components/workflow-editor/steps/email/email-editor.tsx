import { FeatureFlagsKeysEnum, UiComponentEnum, UiSchemaGroupEnum, type UiSchema } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { cn } from '../../../../utils/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Code2 } from '@/components/icons/code-2';

type EmailEditorProps = { uiSchema: UiSchema; isEditorV2?: boolean };

export const EmailEditor = (props: EmailEditorProps) => {
  const { uiSchema, isEditorV2 = false } = props;
  const isHtmlEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED);
  const isLayoutsPageActive = useFeatureFlag(FeatureFlagsKeysEnum.IS_LAYOUTS_PAGE_ACTIVE);

  if (uiSchema.group !== UiSchemaGroupEnum.EMAIL) {
    return null;
  }

  const { body, subject, disableOutputSanitization, editorType, layoutId } = uiSchema.properties ?? {};

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
        {isLayoutsPageActive && (
          <div className="flex items-center gap-0.5 border-b border-t border-neutral-100 px-1 py-0.5">
            <div className="px-[5px] py-1">
              <Code2 className="size-3.5" />
            </div>
            <span className="h-[22px] w-px border-r border-neutral-100" />
            {getComponentByType({ component: layoutId?.component ?? UiComponentEnum.LAYOUT_SELECT })}
          </div>
        )}
      </div>
      {getComponentByType({ component: body.component })}
    </div>
  );
};
