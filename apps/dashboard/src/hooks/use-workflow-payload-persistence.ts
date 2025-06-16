import { useCallback } from 'react';
import { WorkflowResponseDto } from '@novu/shared';
import {
  loadPayloadData,
  savePayloadData,
} from '@/components/workflow-editor/steps/utils/preview-context-storage.utils';
import { PayloadData } from '@/components/workflow-editor/steps/types/preview-context.types';
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
      // Priority: persisted > payloadExample > empty object
      const persistedPayload = loadPersistedPayload();

      if (persistedPayload && Object.keys(persistedPayload).length > 0) {
        return persistedPayload;
      }

      if (isPayloadSchemaEnabled && workflow?.payloadExample) {
        return workflow.payloadExample as PayloadData;
      }

      return {};
    },
    [loadPersistedPayload, isPayloadSchemaEnabled]
  );

  return {
    loadPersistedPayload,
    savePersistedPayload,
    getInitialPayload,
  };
}
