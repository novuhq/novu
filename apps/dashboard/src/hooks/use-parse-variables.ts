import { parseStepVariables } from '@/utils/parseStepVariables';
import type { JSONSchemaDefinition } from '@novu/shared';
import { useMemo } from 'react';
import { useFeatureFlag } from './use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export function useParseVariables(schema?: JSONSchemaDefinition) {
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parsedVariables = useMemo(() => {
    return schema
      ? parseStepVariables(schema, isEnhancedDigestEnabled)
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          isAllowedVariable: () => false,
        };
  }, [schema, isEnhancedDigestEnabled]);

  return parsedVariables;
}
