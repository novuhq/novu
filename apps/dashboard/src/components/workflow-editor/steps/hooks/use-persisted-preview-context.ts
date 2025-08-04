import { useCallback, useEffect, useRef } from 'react';
import { ParsedData, PayloadData, PreviewSubscriberData } from '../types/preview-context.types';
import {
  cleanupExpiredPreviewData,
  clearPayloadData,
  clearPreviewContextData,
  clearSubscriberData,
  loadPayloadData,
  loadPreviewContextData,
  loadSubscriberData,
  mergePreviewContextData,
  savePayloadData,
  savePreviewContextData,
  saveSubscriberData,
} from '../utils/preview-context-storage.utils';

type UsePersistedPreviewContextProps = {
  workflowId: string;
  stepId: string;
  environmentId: string;
  ttlDays?: number;
};

export function usePersistedPreviewContext({ workflowId, stepId, environmentId }: UsePersistedPreviewContextProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    cleanupExpiredPreviewData();
  }, []);

  const loadPersistedData = (): ParsedData | null => {
    if (!workflowId || !stepId || !environmentId) return null;

    return loadPreviewContextData(workflowId, stepId, environmentId);
  };

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

  const clearPersistedData = () => {
    if (!workflowId || !stepId || !environmentId) return;

    clearPreviewContextData(workflowId, stepId, environmentId);
  };

  const loadPersistedPayload = (): PayloadData | null => {
    if (!workflowId || !environmentId) return null;

    return loadPayloadData(workflowId, environmentId);
  };

  const savePersistedPayload = (payload: PayloadData) => {
    if (!workflowId || !environmentId) return;

    savePayloadData(workflowId, environmentId, payload);
  };

  const clearPersistedPayload = () => {
    if (!workflowId || !environmentId) return;

    clearPayloadData(workflowId, environmentId);
  };

  const loadPersistedSubscriber = (): PreviewSubscriberData | null => {
    if (!workflowId || !environmentId) return null;

    return loadSubscriberData(workflowId, environmentId);
  };

  const savePersistedSubscriber = (subscriber: PreviewSubscriberData) => {
    if (!workflowId || !environmentId) return;

    saveSubscriberData(workflowId, environmentId, subscriber);
  };

  const clearPersistedSubscriber = () => {
    if (!workflowId || !environmentId) return;

    clearSubscriberData(workflowId, environmentId);
  };

  const mergeWithDefaults = (persistedData: ParsedData, serverDefaults: ParsedData): ParsedData => {
    return mergePreviewContextData(persistedData, serverDefaults);
  };

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
    loadPersistedSubscriber,
    savePersistedSubscriber,
    clearPersistedSubscriber,
    mergeWithDefaults,
  };
}
