import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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
  const debouncedControlValues = useDebounced(controlValues, 500);
  const { currentEnvironment } = useEnvironment();

  const { previewStep: manualPreviewStep } = usePreviewStep({
    onError: (error) => Sentry.captureException(error),
  });

  const { data: previewData, isPending: isPreviewPending } = useQuery({
    queryKey: ['preview-step', workflowSlug, stepSlug, debouncedControlValues, editorValue],
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

  useEffect(() => {
    if (previewData?.previewPayloadExample) {
      const newValue = JSON.stringify(previewData.previewPayloadExample, null, 2);

      if (newValue !== editorValue) {
        setEditorValue(newValue);
      }
    }
  }, [previewData?.previewPayloadExample, editorValue]);

  return {
    editorValue,
    setEditorValue: setEditorValueSafe,
    previewStep: manualPreview,
    previewData,
    previewSchema: previewData?.schema || null,
    isPreviewPending,
    isTransitioning: JSON.stringify(controlValues) !== JSON.stringify(debouncedControlValues),
  };
};
