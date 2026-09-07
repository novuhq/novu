import { Variable } from '@novu/maily-core/extensions';
import { Editor, NodeViewProps } from '@tiptap/core';
import { EditorView } from '@uiw/react-codemirror';
import React, { useCallback, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { EditorOverlays } from '@/components/editor-overlays';
import { VariableFrom } from '@/components/maily/types';
import {
  MailyVariablesListView,
  VariableSuggestionsPopoverRef,
} from '@/components/maily/views/maily-variables-list-view';
import { BubbleMenuVariablePill, NodeVariablePill } from '@/components/maily/views/variable-view';
import { FormField } from '@/components/primitives/form/form';
import { CompletionRange } from '@/components/primitives/variable-editor';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { useEditorTranslationOverlay } from '@/hooks/use-editor-translation-overlay';
import { useEnhancedVariableValidation } from '@/hooks/use-enhanced-variable-validation';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import { LocalizationResourceEnum } from '@/types/translations';
import { EnhancedParsedVariables, IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { Maily } from '../../../maily/maily';
import { createEditorBlocks, DEFAULT_BLOCK_CONFIG } from '../../../maily/maily-config';
import { isMailyJson } from '../../../maily/maily-utils';
import { ControlInput } from '../../control-input';
import { useWorkflow } from '../../workflow-provider';
import { useWorkflowSchema } from '../../workflow-schema-provider';

const MailyVariablesListViewForWorkflows = React.forwardRef<
  VariableSuggestionsPopoverRef,
  {
    items: Variable[];
    onSelectItem: (item: Variable) => void;
  }
>((props, ref) => {
  const { digestStepBeforeCurrent } = useWorkflow();

  return <MailyVariablesListView {...props} ref={ref} digestStepName={digestStepBeforeCurrent?.stepId} />;
});

const BubbleMenuVariablePillForWorkflows = ({
  opts,
  parsedVariables,
}: {
  opts: {
    variable: Variable;
    fallback?: string;
    editor: Editor;
    from: 'content-variable' | 'bubble-variable' | 'button-variable';
  };
  parsedVariables: EnhancedParsedVariables;
}) => {
  const { digestStepBeforeCurrent, workflow } = useWorkflow();
  const { isPayloadSchemaEnabled, getSchemaPropertyByKey } = useWorkflowSchema();
  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  } = useCreateVariable();

  return (
    <BubbleMenuVariablePill
      isPayloadSchemaEnabled={isPayloadSchemaEnabled}
      digestStepName={digestStepBeforeCurrent?.stepId}
      variableName={opts.variable.name}
      className="h-5 text-xs"
      editor={opts.editor}
      from={opts.from as VariableFrom}
      variables={parsedVariables.variables}
      isAllowedVariable={parsedVariables.isAllowedVariable}
      getSchemaPropertyByKey={getSchemaPropertyByKey}
      openSchemaDrawer={openSchemaDrawer}
      handleCreateNewVariable={handleCreateNewVariable}
    >
      {isPayloadSchemaEnabled && (
        <EditorOverlays
          variables={parsedVariables.variables}
          isAllowedVariable={parsedVariables.isAllowedVariable}
          workflow={workflow}
          resourceId={workflow?.workflowId || ''}
          resourceType={LocalizationResourceEnum.WORKFLOW}
          isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
          onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
          highlightedVariableKey={highlightedVariableKey}
          translationValueInput={ControlInput}
        />
      )}
    </BubbleMenuVariablePill>
  );
};

function createVariableNodeView(variables: LiquidVariable[], isAllowedVariable: IsAllowedVariable) {
  return function VariableView(props: NodeViewProps) {
    const { digestStepBeforeCurrent, workflow } = useWorkflow();
    const { isPayloadSchemaEnabled, getSchemaPropertyByKey } = useWorkflowSchema();
    const {
      handleCreateNewVariable,
      isPayloadSchemaDrawerOpen,
      highlightedVariableKey,
      openSchemaDrawer,
      closeSchemaDrawer,
    } = useCreateVariable();

    return (
      <NodeVariablePill
        {...props}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        digestStepName={digestStepBeforeCurrent?.stepId}
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        openSchemaDrawer={openSchemaDrawer}
        handleCreateNewVariable={handleCreateNewVariable}
      >
        <EditorOverlays
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          workflow={workflow}
          resourceId={workflow?.workflowId || ''}
          resourceType={LocalizationResourceEnum.WORKFLOW}
          isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
          onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
          highlightedVariableKey={highlightedVariableKey}
          translationValueInput={ControlInput}
        />
      </NodeVariablePill>
    );
  };
}

export const EmailBodyMaily = () => {
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { control } = useFormContext();
  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
  const resourceId = workflow?.workflowId || '';
  const resourceType = LocalizationResourceEnum.WORKFLOW;
  const { isPayloadSchemaEnabled, currentSchema, getSchemaPropertyByKey } = useWorkflowSchema();
  const track = useTelemetry();

  const blocks = useMemo(() => {
    return createEditorBlocks({
      track,
      digestStepBeforeCurrent,
      blockConfig: {
        ...DEFAULT_BLOCK_CONFIG,
        highlights: {
          ...DEFAULT_BLOCK_CONFIG.highlights,
          blocks: [
            { type: 'cards', enabled: true, order: 0 },
            { type: 'htmlCodeBlock', enabled: true, order: 1 },
            { type: 'digest', enabled: true, order: 2 },
          ],
        },
      },
    });
  }, [digestStepBeforeCurrent, track]);

  const { handleCreateNewVariable, isPayloadSchemaDrawerOpen, highlightedVariableKey, closeSchemaDrawer } =
    useCreateVariable();

  const variablesSchema = useMemo(
    () => (isPayloadSchemaEnabled && currentSchema ? { ...step?.variables, payload: currentSchema } : step?.variables),
    [isPayloadSchemaEnabled, currentSchema, step?.variables]
  );

  const parsedVariables = useParseVariables(variablesSchema, digestStepBeforeCurrent?.stepId, isPayloadSchemaEnabled);

  const { enhancedIsAllowedVariable } = useEnhancedVariableValidation({
    isAllowedVariable: parsedVariables.isAllowedVariable,
    currentSchema,
    getSchemaPropertyByKey,
  });

  const noopOnChange = useCallback(() => {}, []);

  const {
    selectedTranslation,
    handleTranslationDelete,
    handleTranslationReplaceKey,
    handleTranslationPopoverOpenChange,
    translationTriggerPosition,
    isTranslationPopoverOpen,
    shouldEnableTranslations,
  } = useEditorTranslationOverlay({
    viewRef,
    lastCompletionRef,
    onChange: noopOnChange,
    resourceId,
    resourceType,
    isTranslationEnabledOnResource: !!workflow?.isTranslationEnabled,
  });

  const createTranslationKeyMutation = useCreateTranslationKey();

  const handleCreateNewTranslationKey = useCallback(
    async (translationKey: string) => {
      if (!resourceId) return;

      await createTranslationKeyMutation.mutateAsync({
        resourceId,
        resourceType,
        translationKey,
        defaultValue: `[${translationKey}]`,
      });
    },
    [resourceId, resourceType, createTranslationKeyMutation]
  );

  const { translationKeys, isLoading: isTranslationKeysLoading } = useFetchTranslationKeys({
    resourceId,
    resourceType,
    enabled: shouldEnableTranslations && !!resourceId,
  });

  const isTranslationEnabled = shouldEnableTranslations && !isTranslationKeysLoading;

  const editorKey = useMemo(() => {
    const variableNames = [...parsedVariables.primitives, ...parsedVariables.arrays, ...parsedVariables.namespaces]
      .map((v) => v.name)
      .sort()
      .join(',');

    const translationState = `translation-${isTranslationEnabled ? 'enabled' : 'disabled'}-${translationKeys.length}`;

    return `vars-${variableNames.length}-${variableNames.slice(0, 100)}-${translationState}`;
  }, [
    parsedVariables.primitives,
    parsedVariables.arrays,
    parsedVariables.namespaces,
    isTranslationEnabled,
    translationKeys.length,
  ]);

  const renderVariable = useCallback(
    (opts: {
      variable: Variable;
      fallback?: string;
      editor: Editor;
      from: 'content-variable' | 'bubble-variable' | 'button-variable';
    }) => {
      return <BubbleMenuVariablePillForWorkflows opts={opts} parsedVariables={parsedVariables} />;
    },
    [parsedVariables]
  );

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        const isMaily = isMailyJson(field.value);

        return (
          <Maily
            key={`${editorKey}-repeat-block-enabled`}
            value={isMaily ? field.value : ''}
            onChange={field.onChange}
            variables={parsedVariables}
            blocks={blocks}
            isPayloadSchemaEnabled={isPayloadSchemaEnabled}
            isTranslationEnabled={isTranslationEnabled}
            isContextEnabled={true}
            translationKeys={translationKeys}
            translationValueInput={ControlInput}
            addDigestVariables={!!digestStepBeforeCurrent?.stepId}
            onCreateNewTranslationKey={handleCreateNewTranslationKey}
            onCreateNewVariable={handleCreateNewVariable}
            variableSuggestionsPopover={MailyVariablesListViewForWorkflows}
            renderVariable={renderVariable}
            createVariableNodeView={createVariableNodeView}
            resourceId={resourceId}
            resourceType={resourceType}
          >
            <EditorOverlays
              isTranslationPopoverOpen={isTranslationPopoverOpen}
              selectedTranslation={selectedTranslation}
              onTranslationPopoverOpenChange={handleTranslationPopoverOpenChange}
              onTranslationDelete={handleTranslationDelete}
              onTranslationReplaceKey={handleTranslationReplaceKey}
              translationTriggerPosition={translationTriggerPosition}
              translationValueInput={ControlInput}
              variables={parsedVariables.variables}
              isAllowedVariable={enhancedIsAllowedVariable}
              workflow={workflow}
              resourceId={resourceId}
              resourceType={resourceType}
              isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
              onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
              highlightedVariableKey={highlightedVariableKey}
            />
          </Maily>
        );
      }}
    />
  );
};
