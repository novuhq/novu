import { type JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import merge from 'lodash.merge';
import { useMemo } from 'react';
import { useDynamicPreviewSchema } from '@/hooks/use-dynamic-preview-schema';
import { type EnhancedParsedVariables, parseStepVariables } from '@/utils/parseStepVariables';

export function useParseVariables(
  schema?: JSONSchemaDefinition | JSONSchema7,
  digestStepId?: string,
  isPayloadSchemaEnabled?: boolean,
  isLayout?: boolean
): EnhancedParsedVariables {
  const previewSchema = useDynamicPreviewSchema(isLayout);

  const parsedVariables = useMemo(() => {
    /**
     * Combine static and dynamic schemas to get all variables available in preview
     * schema - the schema created by combining the workflow/layout schema + used variables in control values
     * preview schema - combination of ^schema + preview data (available in step editor or layout editor context)
     */
    const mergedSchema = schema ? merge({}, schema, previewSchema) : schema;

    return mergedSchema
      ? parseStepVariables(mergedSchema, { digestStepId, isPayloadSchemaEnabled })
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          enhancedVariables: [],
          isAllowedVariable: () => false,
        };
  }, [schema, digestStepId, isPayloadSchemaEnabled, previewSchema]);

  return parsedVariables;
}
