import { parseStepVariables } from '@/utils/parseStepVariables';
import type { JSONSchemaDefinition } from '@novu/shared';
import { useMemo } from 'react';

export function useParseVariables(schema?: JSONSchemaDefinition) {
  const parsedVariables = useMemo(() => {
    return schema
      ? parseStepVariables(schema)
      : {
          variables: [],
          namespaces: [],
          primitives: [],
          arrays: [],
          isAllowedVariable: () => false,
        };
  }, [schema]);

  return parsedVariables;
}
