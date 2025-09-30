import { EnvironmentTypeEnum, UiComponentEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { useEnvironment } from '@/context/environment/hooks';
import { cn } from '../../../../utils/ui';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type EmailEditorProps = { uiSchema: UiSchema; isEditorV2?: boolean };

export const EmailEditor = (props: EmailEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema, isEditorV2 = false } = props;

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
            {getComponentByType({ component: editorType?.component ?? UiComponentEnum.EMAIL_EDITOR_SELECT })}
          </EmailPreviewHeader>
        </div>

        <div className={cn(isEditorV2 && 'px-3 py-0')}>{getComponentByType({ component: subject.component })}</div>
        <div className="flex items-center gap-0.5 border-b border-t border-neutral-100 px-1 py-1">
          {getComponentByType({ component: layoutId?.component ?? UiComponentEnum.LAYOUT_SELECT })}
        </div>
      </div>
      {currentEnvironment?.type === EnvironmentTypeEnum.DEV ? (
        getComponentByType({ component: body.component })
      ) : (
        <StepEditorUnavailable />
      )}
    </div>
  );
};
