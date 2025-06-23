import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { PreviewPayload } from '@novu/shared';

import { previewStep } from '@/api/steps';
import { usePreviewStep } from '@/hooks/use-preview-step';
import { useEnvironment } from '@/context/environment/hooks';
import { useDataRef } from '@/hooks/use-data-ref';

type UseEditorPreviewProps = {
  workflowSlug: string;
  stepSlug: string;
  controlValues: Record<string, unknown>;
  payloadSchema?: Record<string, any>;
};

function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const oldValueRef = useDataRef(debouncedValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      const oldValue = JSON.stringify(oldValueRef.current);
      const newValue = JSON.stringify(value);
      if (oldValue === newValue) return;

      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay, oldValueRef]);

  return debouncedValue;
}

const JsonUtils = {
  parse: (value: string): { data: PreviewPayload | null; error: Error | null } => {
    try {
      return { data: JSON.parse(value), error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  stringify: (value: unknown, pretty = true): string => {
    return JSON.stringify(value, null, pretty ? 2 : 0);
  },

  extractPayloadKeys: (data: PreviewPayload | null): string[] => {
    if (!data?.payload || typeof data.payload !== 'object') {
      return [];
    }

    return Object.keys(data.payload).sort();
  },
};

function areKeysEqual(keys1: string[], keys2: string[]): boolean {
  return JSON.stringify(keys1) === JSON.stringify(keys2);
}

export const useEditorPreview = ({ workflowSlug, stepSlug, controlValues, payloadSchema }: UseEditorPreviewProps) => {
  const [editorValue, setEditorValue] = useState('{}');
  const debouncedControlValues = useDebounced(controlValues, 500);
  const { currentEnvironment } = useEnvironment();
  const hasInitializedRef = useRef(false);
  const lastServerKeysRef = useRef<string[]>([]);

  const { previewStep: manualPreviewStep } = usePreviewStep({
    onError: (error) => Sentry.captureException(error),
  });

  const { data: parsedEditorPayload } = JsonUtils.parse(editorValue);

  const {
    data: previewData,
    isPending: isPreviewPending,
    isFetching,
  } = useQuery({
    queryKey: ['preview-step', workflowSlug, stepSlug, debouncedControlValues, editorValue, payloadSchema],
    queryFn: async ({ signal }) => {
      if (!parsedEditorPayload) {
        throw new Error('Invalid JSON in editor');
      }

      return await previewStep({
        environment: currentEnvironment!,
        workflowSlug,
        stepSlug,
        previewData: {
          controlValues: debouncedControlValues,
          previewPayload: parsedEditorPayload,
        },
        signal,
      });
    },
    enabled: Boolean(workflowSlug && stepSlug && currentEnvironment && parsedEditorPayload),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const setEditorValueSafe = useCallback((value: string): Error | null => {
    const { error } = JsonUtils.parse(value);
    if (error) return error;

    setEditorValue(value);
    return null;
  }, []);

  const manualPreview = useCallback(async () => {
    const { data: previewPayload, error } = JsonUtils.parse(editorValue);

    if (error || !previewPayload) {
      throw new Error('Invalid JSON in editor');
    }

    try {
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
    const serverPayloadExample = previewData?.previewPayloadExample;
    if (!serverPayloadExample) return;

    const serverKeys = JsonUtils.extractPayloadKeys(serverPayloadExample);

    const shouldUpdateEditor = !hasInitializedRef.current || !areKeysEqual(serverKeys, lastServerKeysRef.current);

    if (shouldUpdateEditor) {
      setEditorValue(JsonUtils.stringify(serverPayloadExample));
      hasInitializedRef.current = true;
      lastServerKeysRef.current = serverKeys;
    }
  }, [previewData?.previewPayloadExample, parsedEditorPayload]);

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
