import { useMemo } from 'react';
import type { JSONSchema7 } from '@/components/schema-editor/json-schema';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

export const extractVariableKey = (variableName: string): string => {
  return variableName?.replace(/^(current\.)?payload\./, '') || '';
};

export const isPayloadVariable = (variableName: string): boolean => {
  return variableName?.startsWith('payload.') || variableName?.startsWith('current.payload.');
};

export type VariableValidationState = {
  isPayloadVariable: boolean;
  isInSchema: boolean;
  isAllowed: boolean;
  schemaProperty?: JSONSchema7;
  hasError: boolean;
  errorMessage: string;
  variableKey: string;
};

export const useVariableValidation = (
  variableName: string,
  aliasFor: string | null,
  isAllowedVariable: IsAllowedVariable,
  getSchemaPropertyByKey: (keyPath: string) => JSONSchema7 | undefined,
  isPayloadSchemaEnabled: boolean
): VariableValidationState => {
  return useMemo(() => {
    if (!variableName) {
      return {
        isPayloadVariable: false,
        isInSchema: true,
        isAllowed: true,
        hasError: false,
        errorMessage: '',
        variableKey: '',
      };
    }

    const isPayload = isPayloadVariable(variableName);

    if (!isPayload) {
      return {
        isPayloadVariable: false,
        isInSchema: true,
        isAllowed: true,
        hasError: false,
        errorMessage: '',
        variableKey: variableName,
      };
    }

    const variableKey = extractVariableKey(variableName);
    const schemaProperty = getSchemaPropertyByKey(variableKey);

    const isInSchema = !!schemaProperty;

    // Create a variable object for validation
    const variableToCheck: LiquidVariable = { name: variableName, aliasFor };
    const isAllowed = isAllowedVariable(variableToCheck);

    const hasError = isPayload && !isInSchema && isPayloadSchemaEnabled ? true : !isAllowed;
    const errorMessage = hasError ? "Variable schema doesn't exist" : '';

    return {
      isPayloadVariable: isPayload,
      isInSchema,
      isAllowed,
      schemaProperty,
      hasError,
      errorMessage,
      variableKey,
    };
  }, [variableName, aliasFor, isAllowedVariable, getSchemaPropertyByKey]);
};
