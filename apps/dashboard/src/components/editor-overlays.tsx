import { WorkflowResponseDto } from '@novu/shared';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import {
  EditTranslationPopover,
  type TranslationValueInputComponent,
} from '@/components/workflow-editor/steps/email/translations/edit-translation-popover/edit-translation-popover';
import { LocalizationResourceEnum } from '@/types/translations';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

type EditorOverlaysProps = {
  // Translation-related props
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  isTranslationPopoverOpen?: boolean;
  selectedTranslation?: { translationKey: string; from: number; to: number } | null;
  onTranslationPopoverOpenChange?: (open: boolean) => void;
  onTranslationDelete?: () => void;
  onTranslationReplaceKey?: (newKey: string) => void;
  translationTriggerPosition?: { top: number; left: number } | null;

  // Variable and schema-related props
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;

  // Schema-related props
  workflow?: WorkflowResponseDto;
  isPayloadSchemaDrawerOpen?: boolean;
  onPayloadSchemaDrawerOpenChange?: (open: boolean) => void;
  highlightedVariableKey?: string | null;

  // Feature flags
  enableTranslations?: boolean;
  translationValueInput: TranslationValueInputComponent;
};

export function EditorOverlays({
  resourceId,
  resourceType,
  isTranslationPopoverOpen,
  selectedTranslation,
  onTranslationPopoverOpenChange = () => {},
  onTranslationDelete = () => {},
  onTranslationReplaceKey = () => {},
  translationTriggerPosition,
  variables,
  isAllowedVariable,
  workflow,
  isPayloadSchemaDrawerOpen = false,
  onPayloadSchemaDrawerOpenChange = () => {},
  highlightedVariableKey,
  enableTranslations = false,
  translationValueInput,
}: EditorOverlaysProps) {
  return (
    <>
      {isTranslationPopoverOpen && selectedTranslation && resourceId && enableTranslations && (
        <EditTranslationPopover
          open={isTranslationPopoverOpen}
          onOpenChange={onTranslationPopoverOpenChange}
          translationKey={selectedTranslation.translationKey}
          onDelete={onTranslationDelete}
          onReplaceKey={onTranslationReplaceKey}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          resourceId={resourceId}
          resourceType={resourceType}
          position={translationTriggerPosition || undefined}
          translationValueInput={translationValueInput}
        />
      )}

      {isPayloadSchemaDrawerOpen && (
        <PayloadSchemaDrawer
          isOpen={isPayloadSchemaDrawerOpen}
          onOpenChange={onPayloadSchemaDrawerOpenChange}
          workflow={workflow}
          highlightedPropertyKey={highlightedVariableKey || undefined}
        />
      )}
    </>
  );
}
