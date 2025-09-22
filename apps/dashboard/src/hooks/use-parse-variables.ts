import { FeatureFlagsKeysEnum, type JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import { useMemo } from 'react';
import { type EnhancedParsedVariables, parseStepVariables } from '@/utils/parseStepVariables';
import { useFeatureFlag } from './use-feature-flag';

export function useParseVariables(
  schema?: JSONSchemaDefinition | JSONSchema7,
  digestStepId?: string,
  isPayloadSchemaEnabled?: boolean
): EnhancedParsedVariables {
  const isContextVariablesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTEXT_ENABLED);

  const parsedVariables = useMemo(() => {
    return schema
      ? parseStepVariables(schema, { digestStepId, isPayloadSchemaEnabled, isContextVariablesEnabled })
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          enhancedVariables: [],
          isAllowedVariable: () => false,
        };
  }, [schema, digestStepId, isPayloadSchemaEnabled, isContextVariablesEnabled]);

  return parsedVariables;
}
