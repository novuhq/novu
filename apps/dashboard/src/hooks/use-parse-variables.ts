import { parseStepVariables } from '@/utils/parseStepVariables';
import { type JSONSchemaDefinition } from '@novu/shared';
import { useMemo } from 'react';

export function useParseVariables(schema?: JSONSchemaDefinition, digestStepId?: string) {
  const parsedVariables = useMemo(() => {
    return schema
      ? parseStepVariables(schema, { digestStepId })
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          isAllowedVariable: () => false,
        };
  }, [schema, digestStepId]);

  return parsedVariables;
}
