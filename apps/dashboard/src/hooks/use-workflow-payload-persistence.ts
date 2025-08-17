import { WorkflowResponseDto } from '@novu/shared';
import { useCallback } from 'react';
import { PayloadData } from '@/components/workflow-editor/steps/types/preview-context.types';
import {
  loadPayloadData,
  mergeObjectData,
  savePayloadData,
} from '@/components/workflow-editor/steps/utils/preview-context-storage.utils';
import { useIsPayloadSchemaEnabled } from './use-is-payload-schema-enabled';

type UseWorkflowPayloadPersistenceProps = {
  workflowId: string;
  environmentId: string;
};

export function useWorkflowPayloadPersistence({ workflowId, environmentId }: UseWorkflowPayloadPersistenceProps) {
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  const loadPersistedPayload = useCallback((): PayloadData | null => {
    if (!workflowId || !environmentId) return null;

    return loadPayloadData(workflowId, environmentId);
  }, [workflowId, environmentId]);

  const savePersistedPayload = useCallback(
    (payload: PayloadData) => {
      if (!workflowId || !environmentId) return;

      savePayloadData(workflowId, environmentId, payload);
    },
    [workflowId, environmentId]
  );

  const getInitialPayload = useCallback(
    (workflow?: WorkflowResponseDto): PayloadData => {
      // Get the server's payload example (the source of truth for schema)
      const serverPayloadExample =
        isPayloadSchemaEnabled && workflow?.payloadExample ? (workflow.payloadExample as PayloadData) : {};

      // Get persisted payload from localStorage
      const persistedPayload = loadPersistedPayload();

      // If no persisted payload, use server example
      if (!persistedPayload || Object.keys(persistedPayload).length === 0) {
        return serverPayloadExample;
      }

      // If no server example, use persisted (fallback for older workflows)
      if (!serverPayloadExample || Object.keys(serverPayloadExample).length === 0) {
        return persistedPayload;
      }

      // Merge persisted payload with server example
      // This ensures new schema keys are included while preserving user modifications
      return mergeObjectData(persistedPayload, serverPayloadExample);
    },
    [loadPersistedPayload, isPayloadSchemaEnabled]
  );

  return {
    loadPersistedPayload,
    savePersistedPayload,
    getInitialPayload,
  };
}
