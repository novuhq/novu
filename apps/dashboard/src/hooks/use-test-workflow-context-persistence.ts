import { ContextPayload } from '@novu/shared';
import { useCallback } from 'react';
import { clearFromStorage, loadFromStorage, saveToStorage } from '@/utils/local-storage';

type UseTestWorkflowContextPersistenceProps = {
  workflowId: string;
  environmentId: string;
};

function getTestWorkflowContextStorageKey(workflowId: string, environmentId: string): string {
  return `test-workflow-context-${workflowId}-${environmentId}`;
}

export function useTestWorkflowContextPersistence({
  workflowId,
  environmentId,
}: UseTestWorkflowContextPersistenceProps) {
  const loadPersistedContext = useCallback((): ContextPayload | null => {
    if (!workflowId || !environmentId) return null;

    const storageKey = getTestWorkflowContextStorageKey(workflowId, environmentId);
    return loadFromStorage<ContextPayload>(storageKey, 'context');
  }, [workflowId, environmentId]);

  const savePersistedContext = useCallback(
    (context: ContextPayload) => {
      if (!workflowId || !environmentId) return;

      const storageKey = getTestWorkflowContextStorageKey(workflowId, environmentId);
      saveToStorage(storageKey, context, 'context');
    },
    [workflowId, environmentId]
  );

  const clearPersistedContext = useCallback(() => {
    if (!workflowId || !environmentId) return;

    const storageKey = getTestWorkflowContextStorageKey(workflowId, environmentId);
    clearFromStorage(storageKey, 'context');
  }, [workflowId, environmentId]);

  return {
    loadPersistedContext,
    savePersistedContext,
    clearPersistedContext,
  };
}
