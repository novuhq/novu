import {
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  UiComponentEnum,
  type UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiReactjsFill } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { EmailPreviewHeader } from '@/components/workflow-editor/steps/email/email-preview';
import { SenderConfigDrawer } from '@/components/workflow-editor/steps/email/sender-config-drawer';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { cn } from '../../../../utils/ui';
import { useSaveForm } from '../save-form-context';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type EmailEditorProps = { uiSchema: UiSchema; isEditorV2?: boolean };

export const EmailEditor = (props: EmailEditorProps) => {
  const { currentEnvironment, readOnly } = useEnvironment();
  const { uiSchema, isEditorV2 = false } = props;
  const [senderDrawerOpen, setSenderDrawerOpen] = useState(false);
  const { control, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const editorTypeValue = useWatch({ name: 'editorType', control });
  const rendererType = useWatch({ name: 'rendererType', control });
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);

  const isCodeEditor = editorTypeValue === 'html';
  const isReactEmail = isCodeEditor && isStepResolverEnabled && rendererType === 'react-email';
  const showReactEmailHint =
    isCodeEditor && isStepResolverEnabled && !isReactEmail && currentEnvironment?.type === EnvironmentTypeEnum.DEV;
  const canSwitchToReactEmail = currentEnvironment?.type === EnvironmentTypeEnum.DEV && !readOnly;

  const handleSwitchToReactEmail = () => {
    setValue('rendererType', 'react-email');
    saveForm({ forceSubmit: true });
  };

  if (uiSchema.group !== UiSchemaGroupEnum.EMAIL) {
    return null;
  }

  const {
    body,
    subject,
    disableOutputSanitization,
    editorType,
    rendererType: rendererTypeSchema,
    layoutId,
  } = uiSchema.properties ?? {};

  return (
    <>
      <div className="flex h-full flex-col">
        <div className={cn('px-4 pb-0 pt-4', isEditorV2 && 'px-0 pt-0')}>
          <div className={cn(isEditorV2 && 'border-b border-neutral-200 px-3 py-2')}>
            <EmailPreviewHeader minimalHeader={isEditorV2} onEditSenderClick={() => setSenderDrawerOpen(true)}>
              {disableOutputSanitization &&
                getComponentByType({
                  component: disableOutputSanitization.component,
                })}
              {getComponentByType({ component: editorType?.component ?? UiComponentEnum.EMAIL_EDITOR_SELECT })}
            </EmailPreviewHeader>
          </div>

          {subject && !isReactEmail && (
            <div className={cn(isEditorV2 && 'px-3 py-0')}>{getComponentByType({ component: subject.component })}</div>
          )}
          <div className="flex items-center gap-0.5 border-b border-t border-neutral-100 px-1 py-1">
            {isCodeEditor &&
              isStepResolverEnabled &&
              getComponentByType({ component: rendererTypeSchema?.component ?? UiComponentEnum.EMAIL_RENDERER_SELECT })}
            {!isReactEmail && getComponentByType({ component: layoutId?.component ?? UiComponentEnum.LAYOUT_SELECT })}
            {showReactEmailHint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={canSwitchToReactEmail ? handleSwitchToReactEmail : undefined}
                    disabled={!canSwitchToReactEmail}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:cursor-default disabled:opacity-50"
                  >
                    <RiReactjsFill className="size-3.5 text-[#61DAFB]" />
                    Try React.email
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  Manage this email in code with React Email.
                  {canSwitchToReactEmail && ' Click to switch.'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {currentEnvironment?.type === EnvironmentTypeEnum.DEV ? (
          getComponentByType({ component: body.component })
        ) : (
          <StepEditorUnavailable />
        )}
      </div>

      <SenderConfigDrawer open={senderDrawerOpen} onOpenChange={setSenderDrawerOpen} />
    </>
  );
};
