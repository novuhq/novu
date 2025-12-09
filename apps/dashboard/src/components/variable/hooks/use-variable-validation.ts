import { useMemo } from 'react';
import type { JSONSchema7 } from '@/components/schema-editor/json-schema';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { getVariableErrorMessage } from '../utils/get-variable-error-message';

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
  variableName: string;
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
        variableName: '',
      };
    }

    const isPayload = isPayloadVariable(variableName);

    // Always validate with isAllowedVariable (it handles namespace-only variables)
    const variableToCheck: LiquidVariable = { name: variableName, aliasFor };
    const isAllowed = isAllowedVariable(variableToCheck);

    if (!isPayload) {
      const hasError = !isAllowed;
      const errorMessage = getVariableErrorMessage({
        variableName,
        isPayloadVariable: false,
        isAllowed,
      });

      return {
        isPayloadVariable: false,
        isInSchema: true,
        isAllowed,
        hasError,
        errorMessage,
        variableKey: variableName,
        variableName: variableName,
      };
    }

    const variableKey = extractVariableKey(variableName);
    const schemaProperty = getSchemaPropertyByKey(variableKey);

    const isInSchema = !!schemaProperty;

    const hasError = isPayload && !isInSchema && isPayloadSchemaEnabled ? true : !isAllowed;

    const errorMessage = getVariableErrorMessage({
      variableName,
      isPayloadVariable: isPayload,
      isInSchema,
      isAllowed,
      isPayloadSchemaEnabled,
    });

    return {
      isPayloadVariable: isPayload,
      isInSchema,
      isAllowed,
      schemaProperty,
      hasError,
      errorMessage,
      variableKey,
      variableName: variableName,
    };
  }, [variableName, aliasFor, isAllowedVariable, getSchemaPropertyByKey, isPayloadSchemaEnabled]);
};
