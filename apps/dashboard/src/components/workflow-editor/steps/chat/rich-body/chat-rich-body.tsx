import { FeatureFlagsKeysEnum } from '@novu/shared';
import type { Variable } from '@novu/maily-core/extensions';
import type { Editor, NodeViewProps } from '@tiptap/core';
import { useCallback } from 'react';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { BaseBody } from '@/components/workflow-editor/steps/base/base-body';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { BubbleMenuVariablePill, NodeVariablePill } from '@/components/maily/views/variable-view';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { VariableFrom } from '@/components/maily/types';
import { CardHeaderEditor } from './card-header-editor';
import { ChatMaily } from './chat-maily';
import { useCardDocSync } from './use-card-doc-sync';

/**
 * Rich chat body editor entry point.
 *
 * Off flag → legacy single-textarea body editor (`BaseBody`).
 * On flag  → `ChatRichBodyEditor` below, a Tiptap editor restricted to
 *            the chat card block set plus a small card header section
 *            rendered above the editor.
 */
export function ChatRichBody() {
  const isRichChatEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_RICH_CONTENT_ENABLED, false);

  if (!isRichChatEnabled) {
    return <BaseBody />;
  }

  return <ChatRichBodyEditor />;
}

/**
 * Authors a structured `CardElement` tree (stored in `controlValues.card`)
 * alongside a plain-text fallback (stored in `controlValues.body`). Both
 * fields are kept in sync by `useCardDocSync` so providers that don't
 * understand rich content still receive a coherent text message.
 *
 * The editor uses `@novu/maily-core`'s Tiptap editor configured through
 * `ChatMaily`. The card header (title/subtitle/imageUrl) sits above the
 * editor as a separate form section — modeling it inside the PM schema
 * would add complexity without buying any UX.
 */
function ChatRichBodyEditor() {
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { isPayloadSchemaEnabled } = useWorkflowSchema();
  const parsedVariables = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const { handleCreateNewVariable } = useCreateVariable();

  const { initialEditorContent, onEditorUpdate, header, updateHeader } = useCardDocSync();

  const renderVariable = useCallback(
    (opts: {
      variable: Variable;
      fallback?: string;
      editor: Editor;
      from: 'content-variable' | 'bubble-variable' | 'button-variable';
    }) => (
      <ChatBubbleVariablePill
        opts={opts}
        variables={parsedVariables.variables}
        isAllowedVariable={parsedVariables.isAllowedVariable}
      />
    ),
    [parsedVariables.variables, parsedVariables.isAllowedVariable]
  );

  const createVariableNodeView = useCallback(
    (variables: LiquidVariable[], isAllowedVariable: IsAllowedVariable) =>
      function ChatVariableView(props: NodeViewProps) {
        return <ChatNodeVariablePill {...props} variables={variables} isAllowedVariable={isAllowedVariable} />;
      },
    []
  );

  return (
    <div className="shadow-xs flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <CardHeaderEditor
          header={header}
          variables={parsedVariables.variables}
          isAllowedVariable={parsedVariables.isAllowedVariable}
          onUpdate={updateHeader}
        />
      </div>

      <div className="px-4 py-3">
        <ChatMaily
          initialContent={initialEditorContent}
          onChange={onEditorUpdate}
          variables={parsedVariables}
          isPayloadSchemaEnabled={isPayloadSchemaEnabled}
          onCreateNewVariable={handleCreateNewVariable}
          renderVariable={renderVariable}
          createVariableNodeView={createVariableNodeView}
        />
      </div>
    </div>
  );
}

/**
 * Minimal workflow-aware bubble variable pill. Reuses the Maily
 * `BubbleMenuVariablePill` but without the payload-schema drawer
 * overlay — that overlay is tied to the email authoring UX and pulls
 * in hooks we don't need for chat authoring today. When we want drawer
 * integration for chat, lift the shared overlay wiring into a common
 * hook.
 */
function ChatBubbleVariablePill({
  opts,
  variables,
  isAllowedVariable,
}: {
  opts: {
    variable: Variable;
    fallback?: string;
    editor: Editor;
    from: 'content-variable' | 'bubble-variable' | 'button-variable';
  };
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
}) {
  const { digestStepBeforeCurrent } = useWorkflow();
  const { isPayloadSchemaEnabled, getSchemaPropertyByKey } = useWorkflowSchema();
  const { handleCreateNewVariable, openSchemaDrawer } = useCreateVariable();

  return (
    <BubbleMenuVariablePill
      isPayloadSchemaEnabled={isPayloadSchemaEnabled}
      digestStepName={digestStepBeforeCurrent?.stepId}
      variableName={opts.variable.name}
      className="h-5 text-xs"
      editor={opts.editor}
      from={opts.from as VariableFrom}
      variables={variables}
      isAllowedVariable={isAllowedVariable}
      getSchemaPropertyByKey={getSchemaPropertyByKey}
      openSchemaDrawer={openSchemaDrawer}
      handleCreateNewVariable={handleCreateNewVariable}
    />
  );
}

function ChatNodeVariablePill(
  props: NodeViewProps & { variables: LiquidVariable[]; isAllowedVariable: IsAllowedVariable }
) {
  const { digestStepBeforeCurrent } = useWorkflow();
  const { isPayloadSchemaEnabled, getSchemaPropertyByKey } = useWorkflowSchema();
  const { handleCreateNewVariable, openSchemaDrawer } = useCreateVariable();

  return (
    <NodeVariablePill
      {...props}
      isPayloadSchemaEnabled={isPayloadSchemaEnabled}
      digestStepName={digestStepBeforeCurrent?.stepId}
      getSchemaPropertyByKey={getSchemaPropertyByKey}
      openSchemaDrawer={openSchemaDrawer}
      handleCreateNewVariable={handleCreateNewVariable}
    />
  );
}
