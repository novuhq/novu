import merge from 'lodash.merge';
import { useCallback, useContext, useState } from 'react';
import { ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import type { JSONSchema7TypeName } from '@/components/schema-editor/json-schema';
import { StepEditorContext } from '@/components/workflow-editor/steps/context/step-editor-context';
import { usePersistedPreviewContext } from '@/components/workflow-editor/steps/hooks/use-persisted-preview-context';
import { parseJsonValue } from '@/components/workflow-editor/steps/utils/preview-context.utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { useEnvironment } from '@/context/environment/hooks';

type VariableType = 'payload' | 'subscriber' | 'context';

interface VariableInfo {
  type: VariableType;
  key: string;
  fullPath: string;
}

// Variable namespace prefixes
const VARIABLE_PREFIXES = {
  PAYLOAD: 'payload.',
  SUBSCRIBER: 'subscriber.data.',
  CONTEXT: 'context.',
} as const;

/**
 * Parse a variable path to determine its type and extract the key
 */
function parseVariablePath(variablePath: string): VariableInfo | null {
  const prefixMap: Array<{ prefix: string; type: VariableType }> = [
    { prefix: VARIABLE_PREFIXES.PAYLOAD, type: 'payload' },
    { prefix: VARIABLE_PREFIXES.SUBSCRIBER, type: 'subscriber' },
    { prefix: VARIABLE_PREFIXES.CONTEXT, type: 'context' },
  ];

  for (const { prefix, type } of prefixMap) {
    if (variablePath.startsWith(prefix)) {
      return {
        type,
        key: variablePath.replace(prefix, ''),
        fullPath: variablePath,
      };
    }
  }

  return null;
}

/**
 * Create success toast for payload variable creation
 */
function createPayloadVariableSuccessToast() {
  return showToast({
    children: () => (
      <div className="flex min-w-[350px] items-center justify-between gap-1.5">
        <div className="flex items-center gap-3">
          <ToastIcon variant="success" />
          <span className="min-w-[100px] text-sm">Payload variable added to schema</span>
        </div>
      </div>
    ),
    options: {
      position: 'bottom-right',
    },
  });
}

/**
 * Hook that is triggered when a new liquid variable is being created in control-input, email-body or preview-context-panel
 */
export const useCreateVariable = () => {
  const { workflow, step } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  const {
    addProperty: addSchemaProperty,
    handleSaveChanges: handleSaveSchemaChanges,
    isPayloadSchemaEnabled,
  } = useWorkflowSchema();

  const [isPayloadSchemaDrawerOpen, setIsPayloadSchemaDrawerOpen] = useState(false);
  const [highlightedVariableKey, setHighlightedVariableKey] = useState<string | null>(null);

  /**
   * Dynamic variables handling:
   * - payload.*: persisted in workflow.payloadSchema (edited via the schema editor = useWorkflowSchema)
   * - subscriber.data.* and context.*: not persisted; derived from the preview payload
   *
   * In StepEditorContext we update editorValue and persist the preview so the preview API returns
   * a dynamic schema (previewData.schema) including these keys; the UI reads it via useDynamicPreviewSchema
   * and merges it with payloadSchema in useParseVariables to generate the list of variables available in the editor
   *
   * TODO: we should think about how to simplify the entire variable + schema (preview + peristed) logic
   */
  const stepEditor = useContext(StepEditorContext);
  const editorValue = stepEditor?.editorValue;
  const setEditorValue = stepEditor?.setEditorValue;

  const { savePersistedSubscriber, savePersistedContext } = usePersistedPreviewContext({
    workflowId: workflow?.workflowId || '',
    environmentId: currentEnvironment?._id || '',
  });

  const handlePayloadVariable = useCallback(
    async (variableInfo: VariableInfo) => {
      if (!isPayloadSchemaEnabled) {
        showErrorToast('Payload schema is not enabled');
        return;
      }

      addSchemaProperty({ keyName: variableInfo.key }, 'string' as JSONSchema7TypeName);
      await handleSaveSchemaChanges();

      createPayloadVariableSuccessToast();
    },
    [isPayloadSchemaEnabled, addSchemaProperty, handleSaveSchemaChanges]
  );

  const handleSubscriberVariable = useCallback(
    (variableInfo: VariableInfo) => {
      if (!editorValue || !setEditorValue) return;

      const currentPreviewData = parseJsonValue(editorValue);
      const currentSubscriber = currentPreviewData.subscriber || {};
      const currentSubscriberData = currentSubscriber.data || {};

      const newVariable = variableInfo.key
        .split('.')
        .reduceRight((value, key) => ({ [key]: value }), 'example_value' as unknown);

      const updatedSubscriberData = merge({}, currentSubscriberData, newVariable);
      const updatedSubscriber = { ...currentSubscriber, data: updatedSubscriberData };
      const newPreviewData = { ...currentPreviewData, subscriber: updatedSubscriber };

      setEditorValue(JSON.stringify(newPreviewData, null, 2));
      savePersistedSubscriber(updatedSubscriber);
    },
    [setEditorValue, editorValue, savePersistedSubscriber]
  );

  const handleContextVariable = useCallback(
    (variableInfo: VariableInfo) => {
      if (!editorValue || !setEditorValue) return;

      const currentPreviewData = parseJsonValue(editorValue);
      const currentContext = currentPreviewData.context || {};

      const newVariable = variableInfo.key
        .split('.')
        .reduceRight((value, key) => ({ [key]: value }), 'example_value' as unknown);

      const updatedContext = merge({}, currentContext, newVariable);

      // Ensure each context entity has an id field
      for (const contextKey of Object.keys(updatedContext)) {
        const contextValue = updatedContext[contextKey];
        if (typeof contextValue === 'object' && contextValue !== null && !('id' in contextValue)) {
          updatedContext[contextKey] = { id: 'example_id', ...(contextValue as Record<string, unknown>) };
        }
      }

      const newPreviewData = { ...currentPreviewData, context: updatedContext };

      setEditorValue(JSON.stringify(newPreviewData, null, 2));
      savePersistedContext(updatedContext);
    },
    [setEditorValue, editorValue, savePersistedContext]
  );

  const handleCreateNewVariable = useCallback(
    async (variablePath: string) => {
      if (!workflow) {
        return;
      }

      const variableInfo = parseVariablePath(variablePath);
      if (!variableInfo) {
        showErrorToast('Invalid variable path format');
        return;
      }

      try {
        const handlers = {
          payload: handlePayloadVariable,
          subscriber: handleSubscriberVariable,
          context: handleContextVariable,
        } as const;

        const handler = handlers[variableInfo.type];
        if (handler) {
          await handler(variableInfo);
        } else {
          showErrorToast('Unsupported variable type');
        }
      } catch (error) {
        showErrorToast(`Failed to create ${variableInfo.type} variable: ${error}`);
      }
    },
    [workflow, handlePayloadVariable, handleSubscriberVariable, handleContextVariable]
  );

  const openSchemaDrawer = useCallback((variableName?: string) => {
    if (variableName) {
      setHighlightedVariableKey(variableName);
    }

    setIsPayloadSchemaDrawerOpen(true);
  }, []);

  const closeSchemaDrawer = useCallback(() => {
    setIsPayloadSchemaDrawerOpen(false);
    setHighlightedVariableKey(null);
  }, []);

  return {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  };
};
