import * as Sentry from '@sentry/react';
import isEqual from 'lodash.isequal';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { usePreviewStep } from '@/hooks/use-preview-step';

// Custom hook for debouncing values
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export const useEditorPreview = ({
  workflowSlug,
  stepSlug,
  controlValues,
}: {
  workflowSlug: string;
  stepSlug: string;
  controlValues: Record<string, unknown>;
}) => {
  const [editorValue, setEditorValue] = useState('{}');

  // Debounce control values to prevent requests on every keystroke
  const debouncedControlValues = useDebounced(controlValues, 500);

  const {
    previewStep,
    data: previewData,
    isPending: isPreviewPending,
  } = usePreviewStep({
    onSuccess: (res) => {
      const newValue = JSON.stringify(res.previewPayloadExample, null, 2);

      if (!isEqual(editorValue, newValue)) {
        setEditorValueSafe(newValue);
      }
    },
    onError: (error) => {
      Sentry.captureException(error);
    },
  });

  // Use React Query to automatically trigger preview when debounced values change
  // This only triggers after the debounce delay (500ms), preventing requests on every keystroke
  // React Query handles deduplication, caching, and error states automatically
  useQuery({
    queryKey: ['preview-auto-trigger', workflowSlug, stepSlug, debouncedControlValues, editorValue],
    queryFn: async () => {
      try {
        return await previewStep({
          workflowSlug,
          stepSlug,
          previewData: {
            controlValues: debouncedControlValues,
            previewPayload: JSON.parse(editorValue),
          },
        });
      } catch (error) {
        console.error('Failed to parse editorValue for auto preview:', error, editorValue);
        Sentry.captureException(error);
        throw error;
      }
    },
    enabled: Boolean(workflowSlug && stepSlug),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const setEditorValueSafe = (value: string): Error | null => {
    try {
      JSON.parse(value);
      setEditorValue(value);
      return null;
    } catch (e) {
      return e as Error;
    }
  };

  const previewStepCallback = useCallback(async () => {
    try {
      return await previewStep({
        workflowSlug,
        stepSlug,
        previewData: {
          controlValues: debouncedControlValues,
          previewPayload: JSON.parse(editorValue),
        },
      });
    } catch (error) {
      console.error('Failed to parse editorValue for preview:', error, editorValue);
      Sentry.captureException(error);
      throw error;
    }
  }, [previewStep, workflowSlug, stepSlug, debouncedControlValues, editorValue]);

  return {
    editorValue,
    setEditorValue: setEditorValueSafe,
    previewStep: previewStepCallback,
    previewData,
    previewSchema: previewData?.schema || null,
    isPreviewPending,
    // Expose whether we're in a transitioning state (user input ahead of debounced value)
    isTransitioning: !isEqual(controlValues, debouncedControlValues),
  };
};
