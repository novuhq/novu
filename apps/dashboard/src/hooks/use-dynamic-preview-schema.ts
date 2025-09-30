import { JSONSchema7 } from 'json-schema';
import { useContext, useMemo } from 'react';
import { StepEditorContext } from '@/components/workflow-editor/steps/context/step-editor-context';

/**
 * Hook to get the dynamic schema from preview API response
 */
export function useDynamicPreviewSchema(): JSONSchema7 | null {
  const stepEditorContext = useContext(StepEditorContext);

  return useMemo(() => {
    const previewSchema = stepEditorContext?.previewData?.schema;

    if (!previewSchema || typeof previewSchema !== 'object') {
      return null;
    }

    return previewSchema as JSONSchema7;
  }, [stepEditorContext?.previewData?.schema]);
}
