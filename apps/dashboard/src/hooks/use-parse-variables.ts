import { type JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import merge from 'lodash.merge';
import { useMemo } from 'react';
import { useDynamicPreviewSchema } from '@/hooks/use-dynamic-preview-schema';
import { type EnhancedParsedVariables, parseStepVariables } from '@/utils/parseStepVariables';

export function useParseVariables(
  schema?: JSONSchemaDefinition | JSONSchema7,
  digestStepId?: string,
  isPayloadSchemaEnabled?: boolean
): EnhancedParsedVariables {
  const dynamicSchema = useDynamicPreviewSchema();

  const parsedVariables = useMemo(() => {
    /**
     * Combine static and dynamic schemas to get all variables available in preview
     * Static schema - the schema defined in the workflow which is always the same or persisted = subscriber, workflow, steps, payload
     * Dynamic schema - the schema defined in the preview data ad-hoc = context, subscriber.data.*
     */
    const mergedSchema = schema ? merge({}, schema, dynamicSchema) : schema;

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
  }, [schema, digestStepId, isPayloadSchemaEnabled, dynamicSchema]);

  return parsedVariables;
}
