import { parseStepVariablesWithTypes, type EnhancedParsedVariables } from '@/utils/parseStepVariables';
import { type JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import { useMemo } from 'react';

export function useParseVariablesWithTypes(
  schema?: JSONSchemaDefinition | JSONSchema7,
  digestStepId?: string,
  isPayloadSchemaEnabled?: boolean
): EnhancedParsedVariables {
  const parsedVariables = useMemo(() => {
    return schema
      ? parseStepVariablesWithTypes(schema, { digestStepId, isPayloadSchemaEnabled })
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          enhancedVariables: [],
          isAllowedVariable: () => false,
        };
  }, [schema, digestStepId, isPayloadSchemaEnabled]);

  return parsedVariables;
}
