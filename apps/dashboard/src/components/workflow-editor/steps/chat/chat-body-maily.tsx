import { CardActionsExtension, CardButtonExtension, Variable } from '@novu/maily-core/extensions';
import { Editor, NodeViewProps } from '@tiptap/core';
import React, { useCallback, useMemo } from 'react';
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
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { useEnhancedVariableValidation } from '@/hooks/use-enhanced-variable-validation';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import { LocalizationResourceEnum } from '@/types/translations';
import { EnhancedParsedVariables, IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

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
  },
} as const;

const CHAT_ADDITIONAL_EXTENSIONS = [CardActionsExtension, CardButtonExtension];

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

export const ChatBodyMaily = () => {
  const { control } = useFormContext();
  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
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

  const editorKey = useMemo(() => {
    const variableNames = [...parsedVariables.primitives, ...parsedVariables.arrays, ...parsedVariables.namespaces]
      .map((v) => v.name)
      .sort()
      .join(',');

    return `vars-${variableNames.length}-${variableNames.slice(0, 100)}`;
  }, [parsedVariables.primitives, parsedVariables.arrays, parsedVariables.namespaces]);

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
            additionalExtensions={CHAT_ADDITIONAL_EXTENSIONS}
            isPayloadSchemaEnabled={isPayloadSchemaEnabled}
            isTranslationEnabled={false}
            isContextEnabled={true}
            addDigestVariables={!!digestStepBeforeCurrent?.stepId}
            translationValueInput={ControlInput}
            onCreateNewVariable={handleCreateNewVariable}
            variableSuggestionsPopover={MailyVariablesListViewForWorkflows}
            renderVariable={renderVariable}
            createVariableNodeView={createVariableNodeView}
            resourceId={resourceId}
            resourceType={resourceType}
          >
            <EditorOverlays
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
