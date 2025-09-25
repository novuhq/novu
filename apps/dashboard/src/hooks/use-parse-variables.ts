import { type JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import merge from 'lodash.merge';
import { useMemo } from 'react';
import { usePreviewContextSchema } from '@/hooks/use-preview-context-schema';
import { type EnhancedParsedVariables, parseStepVariables } from '@/utils/parseStepVariables';

export function useParseVariables(
  schema?: JSONSchemaDefinition | JSONSchema7,
  digestStepId?: string,
  isPayloadSchemaEnabled?: boolean
): EnhancedParsedVariables {
  const contextSchema = usePreviewContextSchema();

  const parsedVariables = useMemo(() => {
    const mergedSchema = schema ? merge({}, schema, contextSchema) : schema;

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
  }, [schema, digestStepId, isPayloadSchemaEnabled, contextSchema]);

  return parsedVariables;
}
