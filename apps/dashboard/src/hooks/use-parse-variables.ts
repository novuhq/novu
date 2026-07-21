import { type JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import merge from 'lodash.merge';
import { useMemo } from 'react';
import { useContextTypeVariables } from '@/hooks/use-context-type-variables';
import { useDynamicPreviewSchema } from '@/hooks/use-dynamic-preview-schema';
import { type EnhancedParsedVariables, LiquidVariable, parseStepVariables } from '@/utils/parseStepVariables';

export function useParseVariables(
  schema?: JSONSchemaDefinition | JSONSchema7,
  digestStepId?: string,
  isPayloadSchemaEnabled?: boolean,
  isLayout?: boolean
): EnhancedParsedVariables {
  const previewSchema = useDynamicPreviewSchema(isLayout);
  const contextTypeVariables = useContextTypeVariables();

  const parsedVariables = useMemo(() => {
    /**
     * Combine static and dynamic schemas to get all variables available in preview
     * schema - the schema created by combining the workflow/layout schema + used variables in control values
     * preview schema - combination of ^schema + preview data (available in step editor or layout editor context)
     */
    const mergedSchema = schema ? merge({}, schema, previewSchema) : schema;

    const result = mergedSchema
      ? parseStepVariables(mergedSchema, { digestStepId, isPayloadSchemaEnabled })
      : {
          variables: [] as LiquidVariable[],
          namespaces: [] as LiquidVariable[],
          primitives: [] as LiquidVariable[],
          arrays: [] as LiquidVariable[],
          enhancedVariables: [],
          isAllowedVariable: () => false,
        };

    if (contextTypeVariables.length === 0) return result;

    const existingNames = new Set(result.variables.map((v) => v.name));
    const newVars = contextTypeVariables.filter((v) => !existingNames.has(v.name));
    if (newVars.length === 0) return result;

    // Also land in primitives — Maily autocomplete only reads primitives/arrays/namespaces.
    return {
      ...result,
      variables: [...result.variables, ...newVars],
      primitives: [...result.primitives, ...newVars],
    };
  }, [schema, digestStepId, isPayloadSchemaEnabled, previewSchema, contextTypeVariables]);

  return parsedVariables;
}
