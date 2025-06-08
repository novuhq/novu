import { useCallback, useEffect, useRef } from 'react';
import { ParsedData } from '../types/preview-context.types';
import {
  savePreviewContextData,
  loadPreviewContextData,
  mergePreviewContextData,
  clearPreviewContextData,
  cleanupExpiredPreviewData,
  savePayloadData,
  loadPayloadData,
  clearPayloadData,
} from '../utils/preview-context-storage.utils';

type UsePersistedPreviewContextProps = {
  workflowId: string;
  stepId: string;
  environmentId: string;
  ttlDays?: number;
};

export function usePersistedPreviewContext({ workflowId, stepId, environmentId }: UsePersistedPreviewContextProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup expired data on mount
  useEffect(() => {
    cleanupExpiredPreviewData();
  }, []);

  const loadPersistedData = useCallback((): ParsedData | null => {
    if (!workflowId || !stepId || !environmentId) return null;

    return loadPreviewContextData(workflowId, stepId, environmentId);
  }, [workflowId, stepId, environmentId]);

  const savePersistedData = useCallback(
    (data: ParsedData) => {
      if (!workflowId || !stepId || !environmentId) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save operation
      saveTimeoutRef.current = setTimeout(() => {
        savePreviewContextData(workflowId, stepId, environmentId, data);
      }, 500);
    },
    [workflowId, stepId, environmentId]
  );

  const clearPersistedData = useCallback(() => {
    if (!workflowId || !stepId || !environmentId) return;

    clearPreviewContextData(workflowId, stepId, environmentId);
  }, [workflowId, stepId, environmentId]);

  const loadPersistedPayload = useCallback((): any | null => {
    if (!workflowId || !environmentId) return null;

    return loadPayloadData(workflowId, environmentId);
  }, [workflowId, environmentId]);

  const savePersistedPayload = useCallback(
    (payload: any) => {
      if (!workflowId || !environmentId) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save operation
      saveTimeoutRef.current = setTimeout(() => {
        savePayloadData(workflowId, environmentId, payload);
      }, 500);
    },
    [workflowId, environmentId]
  );

  const clearPersistedPayload = useCallback(() => {
    if (!workflowId || !environmentId) return;

    clearPayloadData(workflowId, environmentId);
  }, [workflowId, environmentId]);

  const mergeWithDefaults = useCallback((persistedData: ParsedData, serverDefaults: ParsedData): ParsedData => {
    return mergePreviewContextData(persistedData, serverDefaults);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadPersistedData,
    savePersistedData,
    clearPersistedData,
    loadPersistedPayload,
    savePersistedPayload,
    clearPersistedPayload,
    mergeWithDefaults,
  };
}
