import React from 'react';
import { WorkflowResponseDto } from '@novu/shared';

import { EditTranslationPopover } from '@/components/workflow-editor/steps/email/translations/edit-translation-popover/edit-translation-popover';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

type EditorOverlaysProps = {
  // Translation-related props
  isTranslationPopoverOpen?: boolean;
  selectedTranslation?: { translationKey: string; from: number; to: number } | null;
  onTranslationPopoverOpenChange?: (open: boolean) => void;
  onTranslationDelete?: () => void;
  onTranslationReplaceKey?: (newKey: string) => void;
  translationTriggerPosition?: { top: number; left: number } | null;

  // Variable and schema-related props
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;

  // Workflow and schema-related props
  workflow?: WorkflowResponseDto;
  isPayloadSchemaDrawerOpen: boolean;
  onPayloadSchemaDrawerOpenChange: (open: boolean) => void;
  highlightedVariableKey?: string | null;

  // Feature flags
  enableTranslations?: boolean;
};

export function EditorOverlays({
  isTranslationPopoverOpen,
  selectedTranslation,
  onTranslationPopoverOpenChange = () => {},
  onTranslationDelete = () => {},
  onTranslationReplaceKey = () => {},
  translationTriggerPosition,
  variables,
  isAllowedVariable,
  workflow,
  isPayloadSchemaDrawerOpen,
  onPayloadSchemaDrawerOpenChange,
  highlightedVariableKey,
  enableTranslations = false,
}: EditorOverlaysProps) {
  return (
    <>
      {isTranslationPopoverOpen && selectedTranslation && workflow?._id && enableTranslations && (
        <EditTranslationPopover
          open={isTranslationPopoverOpen}
          onOpenChange={onTranslationPopoverOpenChange}
          translationKey={selectedTranslation.translationKey}
          onDelete={onTranslationDelete}
          onReplaceKey={onTranslationReplaceKey}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          workflowId={workflow._id}
          position={translationTriggerPosition || undefined}
        />
      )}

      <PayloadSchemaDrawer
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={onPayloadSchemaDrawerOpenChange}
        workflow={workflow}
        highlightedPropertyKey={highlightedVariableKey || undefined}
      />
    </>
  );
}
