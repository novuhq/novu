import { ContextPayload } from '@novu/shared';
import { useEffect } from 'react';
import { PayloadData, PreviewSubscriberData } from '../types/preview-context.types';
import {
  cleanupExpiredPreviewData,
  clearContextData,
  clearPayloadData,
  clearSubscriberData,
  loadContextData,
  loadPayloadData,
  loadSubscriberData,
  saveContextData,
  savePayloadData,
  saveSubscriberData,
} from '../utils/preview-context-storage.utils';

type UsePersistedPreviewContextProps = {
  workflowId: string;
  environmentId: string;
};

export function usePersistedPreviewContext({ workflowId, environmentId }: UsePersistedPreviewContextProps) {
  useEffect(() => {
    cleanupExpiredPreviewData();
  }, []);

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

  const loadPersistedContext = (): ContextPayload | null => {
    if (!workflowId || !environmentId) return null;

    return loadContextData(workflowId, environmentId);
  };

  const savePersistedContext = (context: ContextPayload) => {
    if (!workflowId || !environmentId) return;

    saveContextData(workflowId, environmentId, context);
  };

  const clearPersistedContext = () => {
    if (!workflowId || !environmentId) return;

    clearContextData(workflowId, environmentId);
  };

  return {
    loadPersistedPayload,
    savePersistedPayload,
    clearPersistedPayload,
    loadPersistedSubscriber,
    savePersistedSubscriber,
    clearPersistedSubscriber,
    loadPersistedContext,
    savePersistedContext,
    clearPersistedContext,
  };
}
