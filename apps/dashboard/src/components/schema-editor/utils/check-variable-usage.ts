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
 * Extracts variables from Maily JSON nodes
 * Maily stores variables as nodes with type "variable" and an "id" attribute
 */
function extractVariablesFromMailyNode(node: any): string[] {
  if (!node || typeof node !== 'object') return [];

  const variables: string[] = [];

  // Check if this is a variable node
  if (node.type === 'variable' && node.attrs?.id) {
    variables.push(node.attrs.id);
  }

  // Check for variables in button nodes
  if (node.type === 'button' && node.attrs) {
    if (node.attrs.isTextVariable && node.attrs.text) {
      variables.push(node.attrs.text);
    }

    if (node.attrs.isUrlVariable && node.attrs.url) {
      variables.push(node.attrs.url);
    }
  }

  // Check for variables in image nodes
  if ((node.type === 'image' || node.type === 'inlineImage') && node.attrs) {
    if (node.attrs.isSrcVariable && node.attrs.src) {
      variables.push(node.attrs.src);
    }

    if (node.attrs.isExternalLinkVariable && node.attrs.externalLink) {
      variables.push(node.attrs.externalLink);
    }
  }

  // Check for variables in link nodes
  if (node.type === 'link' && node.attrs) {
    if (node.attrs.isUrlVariable && node.attrs.href) {
      variables.push(node.attrs.href);
    }
  }

  // Check for variables in repeat nodes (the 'each' attribute)
  if (node.type === 'repeat' && node.attrs?.each) {
    variables.push(node.attrs.each);
  }

  // Recursively check content array
  if (Array.isArray(node.content)) {
    node.content.forEach((childNode: any) => {
      variables.push(...extractVariablesFromMailyNode(childNode));
    });
  }

  // Check other node properties that might contain nested nodes
  if (node.attrs && typeof node.attrs === 'object') {
    // Skip the attributes we've already checked
    const skipAttrs = [
      'id',
      'text',
      'url',
      'src',
      'externalLink',
      'href',
      'each',
      'isTextVariable',
      'isUrlVariable',
      'isSrcVariable',
      'isExternalLinkVariable',
      'isUrlVariable',
    ];

    Object.entries(node.attrs).forEach(([key, attrValue]) => {
      if (!skipAttrs.includes(key) && typeof attrValue === 'object') {
        variables.push(...extractVariablesFromMailyNode(attrValue));
      }
    });
  }

  return variables;
}

/**
 * Recursively extracts variables from any value (string, object, array)
 */
function extractVariablesFromValue(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === 'string') {
    // First try to parse as JSON (for Maily content)
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === 'object') {
        return extractVariablesFromMailyNode(parsed);
      }
    } catch {
      // Not JSON, treat as regular string
    }

    return extractVariablesFromContent(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractVariablesFromValue(item));
  }

  if (typeof value === 'object') {
    // Check if this might be a Maily node structure
    const mailyVariables = extractVariablesFromMailyNode(value);

    if (mailyVariables.length > 0) {
      return mailyVariables;
    }

    // Otherwise, recursively check all values
    return Object.values(value).flatMap((val) => extractVariablesFromValue(val));
  }

  return [];
}

/**
 * Builds the full path for a nested property including parent paths
 */
function buildFullPropertyPath(parentPath: string, propertyKey: string): string {
  if (!parentPath) return propertyKey;

  // Handle array notation - if parent ends with [n], append property with dot
  if (parentPath.match(/\[\d+\]$/)) {
    return `${parentPath}.${propertyKey}`;
  }

  return `${parentPath}.${propertyKey}`;
}

/**
 * Checks if a specific variable is used in a step's control values
 * Handles nested object paths like "nested.name" or "items[0].name"
 */
function isVariableUsedInStep(variableKey: string, step: StepResponseDto, parentPath: string = ''): boolean {
  if (!step.controls?.values) return false;

  const usedVariables = extractVariablesFromValue(step.controls.values);
  const fullPath = buildFullPropertyPath(parentPath, variableKey);

  // Check for exact match or if the variable starts with the key (for nested properties)
  return usedVariables.some((usedVar) => {
    // Remove 'payload.' prefix for comparison if present
    const normalizedUsedVar = usedVar.startsWith('payload.') ? usedVar.substring(8) : usedVar;
    const normalizedKey = variableKey.startsWith('payload.') ? variableKey.substring(8) : variableKey;
    const normalizedFullPath = fullPath.startsWith('payload.') ? fullPath.substring(8) : fullPath;

    // Check both the simple key and the full nested path
    return (
      normalizedUsedVar === normalizedKey ||
      normalizedUsedVar.startsWith(normalizedKey + '.') ||
      normalizedUsedVar === normalizedFullPath ||
      normalizedUsedVar.startsWith(normalizedFullPath + '.') ||
      // Also check for array access patterns like items[0].name
      normalizedUsedVar.match(new RegExp(`^${normalizedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[\\d+\\]`)) ||
      normalizedUsedVar.match(new RegExp(`^${normalizedFullPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[\\d+\\]`))
    );
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
 * @param parentPath - Parent path for nested properties (e.g., "nested" for "nested.name")
 * @returns Information about variable usage including which steps use it
 */
export function checkVariableUsageInWorkflow(
  variableKey: string,
  steps: StepResponseDto[],
  parentPath: string = ''
): VariableUsageInfo {
  const usedInSteps: Array<{ stepId: string; stepName: string }> = [];

  for (const step of steps) {
    if (isVariableUsedInStep(variableKey, step, parentPath)) {
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
