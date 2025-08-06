import { JSONSchema7 } from 'json-schema';
import { useCallback } from 'react';

import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

type UseEnhancedVariableValidationProps = {
  isAllowedVariable: IsAllowedVariable;
  currentSchema: JSONSchema7 | undefined;
  getSchemaPropertyByKey: (key: string) => JSONSchema7 | undefined;
};

export function useEnhancedVariableValidation({
  isAllowedVariable,
  currentSchema,
  getSchemaPropertyByKey,
}: UseEnhancedVariableValidationProps) {
  // Create an enhanced isAllowedVariable that also checks the current schema
  const enhancedIsAllowedVariable = useCallback(
    (variable: LiquidVariable): boolean => {
      // First check with the original isAllowedVariable
      if (isAllowedVariable(variable)) {
        return true;
      }

      // If not allowed by original function, check if it exists in the current schema
      if (variable.name.startsWith('payload.') && currentSchema) {
        const propertyKey = variable.name.replace('payload.', '');
        return !!getSchemaPropertyByKey(propertyKey);
      }

      return false;
    },
    [isAllowedVariable, currentSchema, getSchemaPropertyByKey]
  );

  return {
    enhancedIsAllowedVariable,
  };
}
