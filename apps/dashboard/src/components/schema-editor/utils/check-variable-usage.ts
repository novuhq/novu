import type { StepResponseDto } from '@novu/shared';
import { parseVariable } from '@/utils/liquid';

/**
 * Extracts all variables from a string content by finding liquid template syntax
 */
function extractVariablesFromContent(content: string): string[] {
  if (!content || typeof content !== 'string') return [];

  // Match all liquid template variables {{variable}}
  const matches = content.match(/\{\{([^{}]+)\}\}/g) || [];

  return matches
    .map((match) => {
      const parsed = parseVariable(match);
      return parsed?.name;
    })
    .filter((name): name is string => !!name);
}

/**
 * Recursively extracts variables from any value (string, object, array)
 */
function extractVariablesFromValue(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === 'string') {
    return extractVariablesFromContent(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractVariablesFromValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value).flatMap((val) => extractVariablesFromValue(val));
  }

  return [];
}

/**
 * Checks if a specific variable is used in a step's control values
 */
function isVariableUsedInStep(variableKey: string, step: StepResponseDto): boolean {
  if (!step.controls?.values) return false;

  const usedVariables = extractVariablesFromValue(step.controls.values);

  // Check for exact match or if the variable starts with the key (for nested properties)
  return usedVariables.some((usedVar) => {
    // Remove 'payload.' prefix for comparison if present
    const normalizedUsedVar = usedVar.startsWith('payload.') ? usedVar.substring(8) : usedVar;
    const normalizedKey = variableKey.startsWith('payload.') ? variableKey.substring(8) : variableKey;

    return normalizedUsedVar === normalizedKey || normalizedUsedVar.startsWith(normalizedKey + '.');
  });
}

export interface VariableUsageInfo {
  isUsed: boolean;
  usedInSteps: Array<{
    stepId: string;
    stepName: string;
  }>;
}

/**
 * Checks if a variable is used in any workflow steps
 * @param variableKey - The variable key to check (e.g., "firstName" or "payload.firstName")
 * @param steps - Array of workflow steps
 * @returns Information about variable usage including which steps use it
 */
export function checkVariableUsageInWorkflow(variableKey: string, steps: StepResponseDto[]): VariableUsageInfo {
  const usedInSteps: Array<{ stepId: string; stepName: string }> = [];

  for (const step of steps) {
    if (isVariableUsedInStep(variableKey, step)) {
      usedInSteps.push({
        stepId: step.stepId,
        stepName: step.name,
      });
    }
  }

  return {
    isUsed: usedInSteps.length > 0,
    usedInSteps,
  };
}
