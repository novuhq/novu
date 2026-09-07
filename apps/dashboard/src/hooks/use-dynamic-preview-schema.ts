import { JSONSchema7 } from 'json-schema';
import { useContext, useMemo } from 'react';
import { LayoutEditorContext } from '@/components/layouts/layout-editor-provider';
import { StepEditorContext } from '@/components/workflow-editor/steps/context/step-editor-context';

/**
 * Hook to get the dynamic schema from preview API response
 *
 * @param isLayout - Set to true for layout editor, defaults to false (step editor for workflows)
 */
export function useDynamicPreviewSchema(isLayout = false): JSONSchema7 | null {
  const stepEditorContext = useContext(StepEditorContext);
  const layoutEditorContext = useContext(LayoutEditorContext);

  return useMemo(() => {
    const schema = isLayout ? layoutEditorContext?.previewData?.schema : stepEditorContext?.previewData?.schema;

    return schema && typeof schema === 'object' ? (schema as JSONSchema7) : null;
  }, [isLayout, stepEditorContext?.previewData?.schema, layoutEditorContext?.previewData?.schema]);
}
