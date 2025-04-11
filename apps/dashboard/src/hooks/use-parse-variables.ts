import { parseStepVariables } from '@/utils/parseStepVariables';
import type { JSONSchemaDefinition } from '@novu/shared';
import { useMemo } from 'react';


export function useParseVariables(schema?: JSONSchemaDefinition, digestStepId?: string) {
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parsedVariables = useMemo(() => {
    return schema
      ? parseStepVariables(schema, { isEnhancedDigestEnabled, digestStepId })
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          isAllowedVariable: () => false,
        };

  }, [schema, isEnhancedDigestEnabled, digestStepId]);


  return parsedVariables;
}
