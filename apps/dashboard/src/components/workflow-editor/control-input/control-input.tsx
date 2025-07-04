import { useMemo, useRef } from 'react';
import { EditorView } from '@uiw/react-codemirror';
import { cva } from 'class-variance-authority';

import { cn } from '@/utils/ui';
import { CompletionRange, VariableEditor } from '@/components/primitives/variable-editor';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { useEditorTranslationOverlay } from '@/hooks/use-editor-translation-overlay';
import { useEnhancedVariableValidation } from '@/hooks/use-enhanced-variable-validation';
import { EditorOverlays } from '@/components/editor-overlays';

const variants = cva('relative w-full', {
  variants: {
    size: {
      md: 'p-2.5',
      sm: 'p-2',
      '2xs': 'px-2 py-1.5',
      '3xs': 'px-1.5 py-1 text-xs',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type ControlInputProps = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'md' | 'sm' | '2xs' | '3xs';
  id?: string;
  multiline?: boolean;
  indentWithTab?: boolean;
  enableTranslations?: boolean;
};

export function ControlInput({
  value,
  onChange,
  onBlur,
  variables,
  className,
  placeholder,
  autoFocus,
  id,
  multiline = false,
  size = 'sm',
  indentWithTab,
  isAllowedVariable,
  enableTranslations = false,
}: ControlInputProps) {
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { workflow, digestStepBeforeCurrent } = useWorkflow();
  const { getSchemaPropertyByKey, isPayloadSchemaEnabled, currentSchema } = useWorkflowSchema();
  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  } = useCreateVariable();

  const {
    translationCompletionSource,
    translationPluginExtension,
    selectedTranslation,
    handleTranslationDelete,
    handleTranslationReplaceKey,
    handleTranslationPopoverOpenChange,
    translationTriggerPosition,
    isTranslationPopoverOpen,
  } = useEditorTranslationOverlay({
    viewRef,
    lastCompletionRef,
    onChange,
    workflow,
    enableTranslations,
  });

  const { enhancedIsAllowedVariable } = useEnhancedVariableValidation({
    isAllowedVariable,
    currentSchema,
    getSchemaPropertyByKey,
  });

  const extensions = useMemo(() => {
    if (!translationPluginExtension) return [];

    return [translationPluginExtension];
  }, [translationPluginExtension]);

  return (
    <VariableEditor
      viewRef={viewRef}
      lastCompletionRef={lastCompletionRef}
      className={cn(variants({ size }), className)}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      variables={variables}
      isAllowedVariable={enhancedIsAllowedVariable}
      placeholder={placeholder}
      autoFocus={autoFocus}
      id={id}
      multiline={multiline}
      indentWithTab={indentWithTab}
      size={size}
      completionSources={translationCompletionSource}
      isPayloadSchemaEnabled={isPayloadSchemaEnabled}
      getSchemaPropertyByKey={getSchemaPropertyByKey}
      extensions={extensions}
      digestStepName={digestStepBeforeCurrent?.stepId}
      skipContainerClick={isTranslationPopoverOpen}
      onManageSchemaClick={openSchemaDrawer}
      onCreateNewVariable={handleCreateNewVariable}
    >
      <EditorOverlays
        isTranslationPopoverOpen={isTranslationPopoverOpen}
        selectedTranslation={selectedTranslation}
        onTranslationPopoverOpenChange={handleTranslationPopoverOpenChange}
        onTranslationDelete={handleTranslationDelete}
        onTranslationReplaceKey={handleTranslationReplaceKey}
        translationTriggerPosition={translationTriggerPosition}
        variables={variables}
        isAllowedVariable={enhancedIsAllowedVariable}
        workflow={workflow}
        isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
        onPayloadSchemaDrawerOpenChange={(isOpen) => {
          if (!isOpen) {
            closeSchemaDrawer();
          }
        }}
        highlightedVariableKey={highlightedVariableKey}
        enableTranslations={enableTranslations}
      />
    </VariableEditor>
  );
}
