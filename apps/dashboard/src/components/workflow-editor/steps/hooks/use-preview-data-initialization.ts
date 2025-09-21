import { ContextPayload, WorkflowResponseDto } from '@novu/shared';
import { useCallback, useEffect, useRef } from 'react';
import { PayloadData, PreviewSubscriberData } from '../types/preview-context.types';
import { parseJsonValue } from '../utils/preview-context.utils';
import { mergePreviewContextData } from '../utils/preview-context-storage.utils';

type InitializationProps = {
  workflowId?: string;
  stepId?: string;
  environmentId?: string;
  value: string;
  onChange: (value: string) => void;
  workflow?: WorkflowResponseDto;
  isPayloadSchemaEnabled: boolean;
  loadPersistedPayload: () => PayloadData | null;
  loadPersistedSubscriber: () => PreviewSubscriberData | null;
  loadPersistedContext: () => ContextPayload | null;
};

export function usePreviewDataInitialization({
  workflowId,
  stepId,
  environmentId,
  value,
  onChange,
  workflow,
  isPayloadSchemaEnabled,
  loadPersistedPayload,
  loadPersistedSubscriber,
  loadPersistedContext,
}: InitializationProps) {
  const isInitializedRef = useRef(false);
  const lastValueRef = useRef(value);

  const initializeData = useCallback(() => {
    // Skip if already initialized or missing required props
    if (isInitializedRef.current || !workflowId || !stepId || !environmentId) {
      return;
    }

    try {
      const currentData = parseJsonValue(value);
      const finalData = { ...currentData };
      let hasChanges = false;

      // Load and apply persisted payload
      const persistedPayload = loadPersistedPayload();

      if (persistedPayload && isPayloadSchemaEnabled && workflow?.payloadExample) {
        // Merge persisted payload with server defaults
        const mergedData = mergePreviewContextData(
          {
            payload: persistedPayload,
            subscriber: {},
            steps: {},
            context: {},
          },
          {
            payload: workflow.payloadExample as PayloadData,
            subscriber: {},
            steps: {},
            context: {},
          }
        );
        finalData.payload = mergedData.payload;
        hasChanges = true;
      } else if (persistedPayload) {
        finalData.payload = persistedPayload;
        hasChanges = true;
      } else if (
        isPayloadSchemaEnabled &&
        workflow?.payloadExample &&
        Object.keys(currentData.payload || {}).length === 0
      ) {
        finalData.payload = workflow.payloadExample as PayloadData;
        hasChanges = true;
      }

      // Load and apply persisted subscriber
      const persistedSubscriber = loadPersistedSubscriber();

      if (persistedSubscriber) {
        finalData.subscriber = persistedSubscriber;
        hasChanges = true;
      }

      // Load and apply persisted context
      const persistedContext = loadPersistedContext();

      if (persistedContext) {
        finalData.context = persistedContext;
        hasChanges = true;
      }

      // Update only if there are changes
      if (hasChanges) {
        const stringified = JSON.stringify(finalData, null, 2);
        onChange(stringified);
      }

      isInitializedRef.current = true;
    } catch (error) {
      console.warn('Failed to initialize preview context data:', error);
      isInitializedRef.current = true;
    }
  }, [
    workflowId,
    stepId,
    environmentId,
    value,
    workflow?.payloadExample,
    isPayloadSchemaEnabled,
    loadPersistedPayload,
    loadPersistedSubscriber,
    loadPersistedContext,
    onChange,
  ]);

  // Initialize data when dependencies are ready
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Reset initialization when key props change
  useEffect(() => {
    if (value !== lastValueRef.current && value === '{}') {
      isInitializedRef.current = false;
      lastValueRef.current = value;
    }
  }, [value]);

  return { isInitialized: isInitializedRef.current };
}
