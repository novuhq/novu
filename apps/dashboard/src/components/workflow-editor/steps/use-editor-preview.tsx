import type { PreviewPayload } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useEnvironment } from '@/context/environment/hooks';
import { useDataRef } from '@/hooks/use-data-ref';
import { usePreviewStep, usePreviewStepFn } from '@/hooks/use-preview-step';
import { parse, stringify } from '@/utils/json';
import { QueryKeys } from '@/utils/query-keys';

type UseEditorPreviewProps = {
  workflowSlug: string;
  stepSlug: string;
  controlValues: Record<string, unknown>;
  payloadSchema?: Record<string, any>;
};

const LOCAL_PREVIEW_REFRESH_INTERVAL_MS = 5 * 1000;

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

const collectDeepKeys = (value: unknown, prefix: string, keys: string[]): void => {
  keys.push(prefix);

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectDeepKeys(child, `${prefix}.${key}`, keys);
    }
  }
};

/**
 * Builds the key signature used to decide whether the server-generated example
 * should be re-applied to the sandbox editor. Payload is compared by its
 * top-level keys; context is compared by deep paths because context entities
 * are nested (e.g. context.tenant.data.companyName) and referencing a new
 * data field must surface in the sandbox too.
 */
const extractSyncKeys = (data: PreviewPayload | null): string[] => {
  const keys: string[] = [];

  if (data?.payload && typeof data.payload === 'object') {
    keys.push(...Object.keys(data.payload).map((key) => `payload.${key}`));
  }

  if (data?.context && typeof data.context === 'object') {
    collectDeepKeys(data.context, 'context', keys);
  }

  return keys.sort();
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
  // Routes to the stateless bridge endpoint for virtual (local mode) workflows.
  const { previewStepFn, isReady: isPreviewFnReady, bridgeUrl, isLocalPreview } = usePreviewStepFn();

  const { data: parsedEditorPayload } = parse(editorValue);

  const {
    data: previewData,
    isPending: isPreviewPending,
    isFetching,
  } = useQuery({
    queryKey: [
      QueryKeys.previewStep,
      currentEnvironment?._id,
      bridgeUrl,
      workflowSlug,
      stepSlug,
      debouncedControlValues,
      editorValue,
      payloadSchema,
    ],
    queryFn: async ({ signal }) => {
      if (!parsedEditorPayload) {
        throw new Error('Invalid JSON in editor');
      }

      return await previewStepFn({
        workflowSlug,
        stepSlug,
        previewData: {
          controlValues: debouncedControlValues,
          previewPayload: parsedEditorPayload,
        },
        signal,
      });
    },
    enabled: Boolean(workflowSlug && stepSlug && currentEnvironment && parsedEditorPayload && isPreviewFnReady),
    staleTime: 0,
    retry: false,
    // In local mode the step template lives in the developer's code and can
    // change at any moment without anything in the query key changing (the
    // bridge renders it at preview time). Re-render on tab focus and on a
    // short interval so the preview tracks code edits; `keepPreviousData`
    // prevents flicker between renders.
    refetchOnWindowFocus: isLocalPreview,
    refetchInterval: isLocalPreview ? LOCAL_PREVIEW_REFRESH_INTERVAL_MS : false,
    placeholderData: keepPreviousData,
  });

  const setEditorValueSafe = useCallback((value: string): Error | null => {
    const { error } = parse(value);
    if (error) return error;

    setEditorValue(value);
    return null;
  }, []);

  const manualPreview = useCallback(async () => {
    const { data: previewPayload, error } = parse(editorValue);

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

    const serverKeys = extractSyncKeys(serverPayloadExample);

    const shouldUpdateEditor = !hasInitializedRef.current || !areKeysEqual(serverKeys, lastServerKeysRef.current);

    if (shouldUpdateEditor) {
      setEditorValue(stringify(serverPayloadExample));
      hasInitializedRef.current = true;
      lastServerKeysRef.current = serverKeys;
    }
  }, [previewData?.previewPayloadExample]);

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
