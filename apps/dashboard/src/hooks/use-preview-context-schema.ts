import { FeatureFlagsKeysEnum } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import { useContext, useMemo } from 'react';
import { generateSchemaFromJson } from '@/components/workflow-editor/payload-schema/utils/generate-schema';
import { StepEditorContext } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

/**
 * Hook to generate context schema from preview data
 */
export function usePreviewContextSchema(): JSONSchema7 | null {
  const stepEditorContext = useContext(StepEditorContext);
  const previewData = stepEditorContext?.previewData || null;
  const isContextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXT_ENABLED);

  return useMemo(() => {
    if (!isContextEnabled) {
      return null;
    }

    const previewContextData = previewData?.previewPayloadExample?.context;
    if (!previewContextData || Object.keys(previewContextData).length === 0) {
      return null;
    }

    // Generate JSON schema from the context data
    const contextSchema = generateSchemaFromJson(previewContextData);

    // Wrap it in a context property to namespace it properly
    return {
      type: 'object',
      properties: {
        context: contextSchema,
      },
    } as JSONSchema7;
  }, [previewData, isContextEnabled]);
}
