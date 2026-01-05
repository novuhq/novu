import { isNamespaceOnlyVariable } from '@/utils/liquid';

export type VariableErrorContext = {
  variableName: string;
  isPayloadVariable: boolean;
  isAllowed: boolean;
  isInSchema?: boolean;
  isPayloadSchemaEnabled?: boolean;
};

/**
 * Centralized function to get error messages for invalid variables.
 * Used by both Maily editor and variable-editor (CodeMirror) for consistency.
 */
export function getVariableErrorMessage({
  variableName,
  isPayloadVariable: isPayload,
  isAllowed,
  isInSchema,
  isPayloadSchemaEnabled,
}: VariableErrorContext): string {
  if (!variableName) {
    return '';
  }

  // Payload variables missing from schema (only check if schema is enabled)
  if (isPayload && isPayloadSchemaEnabled && isInSchema === false) {
    return 'Variable missing from schema';
  }

  // Namespace-only variables (e.g., {{payload}}, {{context}})
  if (!isAllowed) {
    const isNamespaceOnly = isNamespaceOnlyVariable(variableName);
    if (isNamespaceOnly) {
      return `Variable '${variableName}' requires a property`;
    }
    return 'invalid or missing namespace';
  }

  return '';
}
