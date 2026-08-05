import { CardActionsExtension, CardButtonExtension, Variable } from '@novu/maily-core/extensions';
import { Editor, NodeViewProps } from '@tiptap/core';
import { EditorView } from '@uiw/react-codemirror';
import React, { useCallback, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { EditorOverlays } from '@/components/editor-overlays';
import { createChatEditorBlocks } from '@/components/maily/chat-blocks';
import { Maily } from '@/components/maily/maily';
import { isMailyJson, plainTextToMailyJson, wrapLegacyCardButtons } from '@/components/maily/maily-utils';
import { VariableFrom } from '@/components/maily/types';
import {
  MailyVariablesListView,
  VariableSuggestionsPopoverRef,
} from '@/components/maily/views/maily-variables-list-view';
import { BubbleMenuVariablePill, NodeVariablePill } from '@/components/maily/views/variable-view';
import { FormField } from '@/components/primitives/form/form';
import { CompletionRange } from '@/components/primitives/variable-editor';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { useEditorTranslationOverlay } from '@/hooks/use-editor-translation-overlay';
import { useEnhancedVariableValidation } from '@/hooks/use-enhanced-variable-validation';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import { LocalizationResourceEnum } from '@/types/translations';

const CHAT_MENU_CONFIG = {
  text: {
    showTurnInto: false,
    showUnderline: false,
    showAlignment: false,
    showTextColor: false,
  },
  image: {
    showAlignment: false,
    showExternalLink: false,
    showSizeControls: false,
  },
} as const;

const CHAT_IMAGE_EXTENSION_OPTIONS = {
  resizable: false,
  defaultAlignment: 'left' as const,
  // Match chat preview `MessageImage` (`max-h-60` → 240px) so editor size matches preview.
  maxHeight: 240,
};

const CHAT_ADDITIONAL_EXTENSIONS = [CardActionsExtension, CardButtonExtension];

function useChatParsedVariables() {
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { isPayloadSchemaEnabled, currentSchema } = useWorkflowSchema();

  const variablesSchema = useMemo(
    () => (isPayloadSchemaEnabled && currentSchema ? { ...step?.variables, payload: currentSchema } : step?.variables),
    [isPayloadSchemaEnabled, currentSchema, step?.variables]
  );

  return useParseVariables(variablesSchema, digestStepBeforeCurrent?.stepId, isPayloadSchemaEnabled);
}

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
MailyVariablesListViewForWorkflows.displayName = 'MailyVariablesListViewForWorkflows';

const BubbleMenuVariablePillForWorkflows = ({
  opts,
}: {
  opts: {
    variable: Variable;
    fallback?: string;
    editor: Editor;
    from: 'content-variable' | 'bubble-variable' | 'button-variable';
  };
}) => {
  const { digestStepBeforeCurrent, workflow } = useWorkflow();
  const { isPayloadSchemaEnabled, getSchemaPropertyByKey } = useWorkflowSchema();
  const parsedVariables = useChatParsedVariables();
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
      className={
        opts.from === 'bubble-variable'
          ? // Actions Label/URL fields are h-6 — keep the pill from growing the row.
            'h-[18px] max-h-[18px] py-0 text-xs leading-none'
          : 'h-5 text-xs'
      }
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

function createVariableNodeView() {
  return function VariableView(props: NodeViewProps) {
    const { digestStepBeforeCurrent, workflow } = useWorkflow();
    const { isPayloadSchemaEnabled, getSchemaPropertyByKey } = useWorkflowSchema();
    const parsedVariables = useChatParsedVariables();
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
        variables={parsedVariables.variables}
        isAllowedVariable={parsedVariables.isAllowedVariable}
        isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        digestStepName={digestStepBeforeCurrent?.stepId}
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        openSchemaDrawer={openSchemaDrawer}
        handleCreateNewVariable={handleCreateNewVariable}
      >
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
      </NodeVariablePill>
    );
  };
}

// Stable factory — node views read live schema via hooks, so we must not remount
// Maily when variables change (that closed the Actions bubble after Create).
const chatCreateVariableNodeView = createVariableNodeView();

export const ChatBodyMaily = () => {
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { control } = useFormContext();
  const { digestStepBeforeCurrent, workflow } = useWorkflow();
  const resourceId = workflow?.workflowId || '';
  const resourceType = LocalizationResourceEnum.WORKFLOW;
  const { isPayloadSchemaEnabled, currentSchema, getSchemaPropertyByKey } = useWorkflowSchema();
  const track = useTelemetry();

  const blocks = useMemo(
    () => createChatEditorBlocks({ track, digestStepBeforeCurrent }),
    [track, digestStepBeforeCurrent]
  );

  const { handleCreateNewVariable, isPayloadSchemaDrawerOpen, highlightedVariableKey, closeSchemaDrawer } =
    useCreateVariable();

  const parsedVariables = useChatParsedVariables();

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

  // Remount only when translations flip on/off so the translation extension mounts. Chat intentionally
  // avoids remounting on variable/key changes (see `chatCreateVariableNodeView`) to keep the Actions bubble open.
  const editorKey = `translation-${isTranslationEnabled ? 'enabled' : 'disabled'}`;

  const renderVariable = useCallback(
    (opts: {
      variable: Variable;
      fallback?: string;
      editor: Editor;
      from: 'content-variable' | 'bubble-variable' | 'button-variable';
    }) => {
      return <BubbleMenuVariablePillForWorkflows opts={opts} />;
    },
    []
  );

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        const rawBody: string = field.value ?? '';
        // Back-compat: Maily JSON loads as-is; a legacy plain string opens as
        // text blocks; an empty body starts a fresh block editor.
        const getEditorValue = () => {
          if (isMailyJson(rawBody)) {
            return wrapLegacyCardButtons(rawBody);
          }

          return rawBody.length > 0 ? plainTextToMailyJson(rawBody) : '';
        };

        return (
          <Maily
            key={editorKey}
            value={getEditorValue()}
            onChange={field.onChange}
            variables={parsedVariables}
            blocks={blocks}
            menuConfig={CHAT_MENU_CONFIG}
            imageExtensionOptions={CHAT_IMAGE_EXTENSION_OPTIONS}
            additionalExtensions={CHAT_ADDITIONAL_EXTENSIONS}
            isPayloadSchemaEnabled={isPayloadSchemaEnabled}
            isTranslationEnabled={isTranslationEnabled}
            isContextEnabled={true}
            translationKeys={translationKeys}
            addDigestVariables={!!digestStepBeforeCurrent?.stepId}
            translationValueInput={ControlInput}
            onCreateNewTranslationKey={handleCreateNewTranslationKey}
            onCreateNewVariable={handleCreateNewVariable}
            variableSuggestionsPopover={MailyVariablesListViewForWorkflows}
            renderVariable={renderVariable}
            createVariableNodeView={() => chatCreateVariableNodeView}
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
              variables={parsedVariables.variables}
              isAllowedVariable={enhancedIsAllowedVariable}
              workflow={workflow}
              resourceId={resourceId}
              resourceType={resourceType}
              isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
              onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
              highlightedVariableKey={highlightedVariableKey}
              translationValueInput={ControlInput}
            />
          </Maily>
        );
      }}
    />
  );
};
