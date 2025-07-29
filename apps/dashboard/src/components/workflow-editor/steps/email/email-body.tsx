import React, { useCallback, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Variable } from '@maily-to/core/extensions';

import { FormField } from '@/components/primitives/form/form';
import { Maily } from '../../../maily/maily';
import { HtmlEditor } from '@/components/html-editor';
import { isMailyJson } from '../../../maily/maily-utils';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useWorkflow } from '../../workflow-provider';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useWorkflowSchema } from '../../workflow-schema-provider';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useTelemetry } from '@/hooks/use-telemetry';
import { createEditorBlocks, DEFAULT_BLOCK_CONFIG } from '../../../maily/maily-config';
import {
  MailyVariablesListView,
  VariableSuggestionsPopoverRef,
} from '@/components/maily/views/maily-variables-list-view';
import { BubbleMenuVariablePill, NodeVariablePill } from '@/components/maily/views/variable-view';
import { Editor, NodeViewProps } from '@tiptap/core';
import { VariableFrom } from '@/components/maily/types';
import { EnhancedParsedVariables, IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { CompletionRange } from '@/components/primitives/variable-editor';
import { EditorView } from '@uiw/react-codemirror';
import { useEditorTranslationOverlay } from '@/hooks/use-editor-translation-overlay';
import { useEnhancedVariableValidation } from '@/hooks/use-enhanced-variable-validation';
import { EditorOverlays } from '@/components/editor-overlays';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';

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
          isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
          onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
          highlightedVariableKey={highlightedVariableKey}
        />
      )}
    </BubbleMenuVariablePill>
  );
};

// HOC factory for creating TipTap node views
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
          isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
          onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
          highlightedVariableKey={highlightedVariableKey}
        />
      </NodeVariablePill>
    );
  };
}

export const EmailBody = () => {
  const isLayoutsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_LAYOUTS_PAGE_ACTIVE);
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { control, setValue } = useFormContext();
  const editorType = useWatch({ name: 'editorType', control });
  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
  const { isPayloadSchemaEnabled, currentSchema, getSchemaPropertyByKey } = useWorkflowSchema();
  const { saveForm } = useSaveForm();
  const track = useTelemetry();

  const onChange = useCallback(
    (value: string) => {
      setValue('body', value);
    },
    [setValue]
  );

  const blocks = useMemo(() => {
    if (isLayoutsPageEnabled) {
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
    }

    return createEditorBlocks({
      track,
      digestStepBeforeCurrent,
    });
  }, [digestStepBeforeCurrent, isLayoutsPageEnabled, track]);

  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    closeSchemaDrawer,
    openSchemaDrawer,
  } = useCreateVariable();

  // Use currentSchema if available (when payload schema is enabled), otherwise fall back to step variables
  const variablesSchema = useMemo(
    () => (isPayloadSchemaEnabled && currentSchema ? { ...step?.variables, payload: currentSchema } : step?.variables),
    [isPayloadSchemaEnabled, currentSchema, step?.variables]
  );

  const parsedVariables = useParseVariables(variablesSchema, digestStepBeforeCurrent?.stepId, isPayloadSchemaEnabled);

  const {
    translationCompletionSource,
    translationPluginExtension,
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
    onChange,
    workflow,
  });

  const createTranslationKeyMutation = useCreateTranslationKey();

  const handleCreateNewTranslationKey = useCallback(
    async (translationKey: string) => {
      if (!workflow?._id) return;

      await createTranslationKeyMutation.mutateAsync({
        workflowId: workflow._id,
        translationKey,
        defaultValue: `[${translationKey}]`, // Placeholder value to indicate missing translation
      });
    },
    [workflow?._id, createTranslationKeyMutation]
  );

  const { translationKeys, isLoading: isTranslationKeysLoading } = useFetchTranslationKeys({
    workflowId: workflow?._id || '',
    enabled: shouldEnableTranslations && !!workflow?._id,
  });

  // Create a key that changes when variables or translation state changes to force extension recreation
  const editorKey = useMemo(() => {
    const variableNames = [...parsedVariables.primitives, ...parsedVariables.arrays, ...parsedVariables.namespaces]
      .map((v) => v.name)
      .sort()
      .join(',');

    // Include translation state to force re-mount when translation extension becomes ready
    const translationState = `translation-${shouldEnableTranslations ? 'enabled' : 'disabled'}-${isTranslationKeysLoading ? 'loading' : 'loaded'}-${translationKeys.length}`;

    return `vars-${variableNames.length}-${variableNames.slice(0, 100)}-${translationState}`;
  }, [
    parsedVariables.primitives,
    parsedVariables.arrays,
    parsedVariables.namespaces,
    shouldEnableTranslations,
    isTranslationKeysLoading,
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

  const { enhancedIsAllowedVariable } = useEnhancedVariableValidation({
    isAllowedVariable: parsedVariables.isAllowedVariable,
    currentSchema,
    getSchemaPropertyByKey,
  });

  const extensions = useMemo(() => {
    if (!translationPluginExtension) return [];

    return [translationPluginExtension];
  }, [translationPluginExtension]);

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        // when switching to html/block editor, we still might have locally maily json or html content
        // so we need will show the empty string until we receive the updated value from the server
        const isMaily = isMailyJson(field.value);

        if (editorType === 'html') {
          return (
            <HtmlEditor
              viewRef={viewRef}
              lastCompletionRef={lastCompletionRef}
              value={isMaily ? '' : field.value}
              variables={parsedVariables.variables}
              isAllowedVariable={enhancedIsAllowedVariable}
              onChange={field.onChange}
              saveForm={saveForm}
              completionSources={translationCompletionSource}
              isPayloadSchemaEnabled={isPayloadSchemaEnabled}
              isTranslationEnabled={shouldEnableTranslations && !isTranslationKeysLoading}
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
                variables={parsedVariables.variables}
                isAllowedVariable={enhancedIsAllowedVariable}
                workflow={workflow}
                isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
                onPayloadSchemaDrawerOpenChange={(isOpen) => {
                  if (!isOpen) {
                    closeSchemaDrawer();
                  }
                }}
                highlightedVariableKey={highlightedVariableKey}
                enableTranslations={shouldEnableTranslations}
              />
            </HtmlEditor>
          );
        }

        return (
          <Maily
            key={`${editorKey}-repeat-block-enabled`}
            value={isMaily ? field.value : ''}
            onChange={field.onChange}
            variables={parsedVariables}
            blocks={blocks}
            isPayloadSchemaEnabled={isPayloadSchemaEnabled}
            isTranslationEnabled={shouldEnableTranslations && !isTranslationKeysLoading}
            translationKeys={translationKeys}
            addDigestVariables={!!digestStepBeforeCurrent?.stepId}
            onCreateNewTranslationKey={handleCreateNewTranslationKey}
            onCreateNewVariable={handleCreateNewVariable}
            variableSuggestionsPopover={MailyVariablesListViewForWorkflows}
            renderVariable={renderVariable}
            createVariableNodeView={createVariableNodeView}
          >
            <EditorOverlays
              isTranslationPopoverOpen={isTranslationPopoverOpen}
              selectedTranslation={selectedTranslation}
              onTranslationPopoverOpenChange={handleTranslationPopoverOpenChange}
              onTranslationDelete={handleTranslationDelete}
              onTranslationReplaceKey={handleTranslationReplaceKey}
              translationTriggerPosition={translationTriggerPosition}
              variables={parsedVariables.variables}
              isAllowedVariable={enhancedIsAllowedVariable}
              workflow={workflow}
              isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
              onPayloadSchemaDrawerOpenChange={(isOpen) => {
                if (!isOpen) {
                  closeSchemaDrawer();
                }
              }}
              highlightedVariableKey={highlightedVariableKey}
            />
          </Maily>
        );
      }}
    />
  );
};
