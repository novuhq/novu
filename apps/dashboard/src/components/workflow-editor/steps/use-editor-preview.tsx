import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { previewStep } from '@/api/steps';
import { usePreviewStep } from '@/hooks/use-preview-step';
import { useEnvironment } from '@/context/environment/hooks';

// Custom hook for debouncing values
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Helper function to extract payload keys from the example data
function getPayloadKeys(previewPayloadExample: any): string[] {
  if (!previewPayloadExample?.payload || typeof previewPayloadExample.payload !== 'object') {
    return [];
  }

  return Object.keys(previewPayloadExample.payload).sort();
}

// Helper function to extract payload keys from current editor value
function getCurrentPayloadKeys(editorValue: string): string[] {
  try {
    const parsed = JSON.parse(editorValue);

    if (!parsed?.payload || typeof parsed.payload !== 'object') {
      return [];
    }

    return Object.keys(parsed.payload).sort();
  } catch {
    return [];
  }
}

export const useEditorPreview = ({
  workflowSlug,
  stepSlug,
  controlValues,
  payloadSchema,
}: {
  workflowSlug: string;
  stepSlug: string;
  controlValues: Record<string, unknown>;
  payloadSchema?: Record<string, any>;
}) => {
  const [editorValue, setEditorValue] = useState('{}');
  const debouncedControlValues = useDebounced(controlValues, 500);
  const { currentEnvironment } = useEnvironment();
  const hasInitializedEditorValueRef = useRef(false);

  const { previewStep: manualPreviewStep } = usePreviewStep({
    onError: (error) => Sentry.captureException(error),
  });

  const {
    data: previewData,
    isPending: isPreviewPending,
    isFetching,
  } = useQuery({
    queryKey: ['preview-step', workflowSlug, stepSlug, debouncedControlValues, editorValue, payloadSchema],
    queryFn: async ({ signal }) => {
      const previewPayload = JSON.parse(editorValue);

      return await previewStep({
        environment: currentEnvironment!,
        workflowSlug,
        stepSlug,
        previewData: {
          controlValues: debouncedControlValues,
          previewPayload,
        },
        signal,
      });
    },
    enabled: Boolean(workflowSlug && stepSlug && currentEnvironment),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const setEditorValueSafe = useCallback((value: string): Error | null => {
    try {
      JSON.parse(value);
      setEditorValue(value);
      return null;
    } catch (error) {
      return error as Error;
    }
  }, []);

  const manualPreview = useCallback(async () => {
    try {
      const previewPayload = JSON.parse(editorValue);

      return await manualPreviewStep({
        workflowSlug,
        stepSlug,
        previewData: {
          controlValues: debouncedControlValues,
          previewPayload,
        },
      });
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }, [manualPreviewStep, workflowSlug, stepSlug, debouncedControlValues, editorValue]);

  // Initialize editor value on first load or when payload schema changes
  useEffect(() => {
    if (!previewData?.previewPayloadExample) {
      return;
    }

    const serverPayloadKeys = getPayloadKeys(previewData.previewPayloadExample);
    const currentPayloadKeys = getCurrentPayloadKeys(editorValue);

    // Check if schema has changed by comparing both directions:
    // 1. Keys added to server response (not in current editor)
    // 2. Keys removed from server response (in current editor but not in server)
    const hasPayloadSchemaChanged =
      hasInitializedEditorValueRef.current && JSON.stringify(serverPayloadKeys) !== JSON.stringify(currentPayloadKeys);

    // Update editor value if:
    // 1. This is the first load, OR
    // 2. The payload schema has changed (new/removed variables)
    if (!hasInitializedEditorValueRef.current || hasPayloadSchemaChanged) {
      const newValue = JSON.stringify(previewData.previewPayloadExample, null, 2);
      setEditorValue(newValue);
      hasInitializedEditorValueRef.current = true;
    }
  }, [previewData?.previewPayloadExample, editorValue]);

  return {
    editorValue,
    setEditorValue: setEditorValueSafe,
    previewStep: manualPreview,
    previewData,
    previewSchema: previewData?.schema || null,
    isPreviewPending,
    isFetching,
    isTransitioning: JSON.stringify(controlValues) !== JSON.stringify(debouncedControlValues),
  };
};
