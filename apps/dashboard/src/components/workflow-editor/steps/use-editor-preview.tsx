import * as Sentry from '@sentry/react';
import isEqual from 'lodash.isequal';
import { useCallback, useEffect, useState } from 'react';

import { useDataRef } from '@/hooks/use-data-ref';
import { usePreviewStep } from '@/hooks/use-preview-step';

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
  const dataRef = useDataRef({
    workflowSlug,
    stepSlug,
    controlValues,
    editorValue,
  });

  useEffect(() => {
    previewStep({
      workflowSlug: dataRef.current.workflowSlug,
      stepSlug: dataRef.current.stepSlug,
      previewData: {
        controlValues: dataRef.current.controlValues,
        previewPayload: JSON.parse(dataRef.current.editorValue),
      },
    });
  }, [dataRef, previewStep]);

  const setEditorValueSafe = (value: string): Error | null => {
    try {
      JSON.parse(value);
      setEditorValue(value);
      return null;
    } catch (e) {
      return e as Error;
    }
  };

  const previewStepCallback = useCallback(() => {
    return previewStep({
      workflowSlug,
      stepSlug,
      previewData: { controlValues, previewPayload: JSON.parse(editorValue) },
    });
  }, [workflowSlug, stepSlug, controlValues, editorValue, previewStep]);

  return {
    editorValue,
    setEditorValue: setEditorValueSafe,
    previewStep: previewStepCallback,
    previewData,
    isPreviewPending,
  };
};
