import { LAYOUT_CONTENT_VARIABLE } from '@novu/shared';
import { isAllowedAlias } from '@/components/maily/repeat-block-aliases';

export type VariableMatch = {
  fullLiquidExpression: string;
  liquidVariable: string;
  name: string;
  nameRoot: string;
  filtersArray: string[];
  filters: string;
};

export const VARIABLE_REGEX_STRING = '{{([^{}]+)}}';

/**
 * Checks if a variable is a namespace-only variable (invalid single-part variable).
 * Based on the API parser logic: single-part variables are invalid unless they're:
 * - Content variables (LAYOUT_CONTENT_VARIABLE)
 * - Allowed aliases (e.g., "current" in repeat blocks)
 * - Local variables (from loops, checked separately by callers)
 */
export function isNamespaceOnlyVariable(variableName: string): boolean {
  const hasNoNamespace = variableName.split('.').length === 1;

  if (!hasNoNamespace) {
    return false;
  }

  // Content variables are valid single-part variables
  if (variableName === LAYOUT_CONTENT_VARIABLE) {
    return false;
  }

  // Allowed aliases (e.g., "current" in repeat blocks) are valid single-part variables
  // Note: Actual validation of whether we're in a repeat block happens later
  // where editor context is available (e.g., in variable-view.tsx)
  if (isAllowedAlias(variableName)) {
    return false;
  }

  // All other single-part variables are invalid (namespace-only)
  return true;
}

const stripBrackets = (value: string): string => {
  return value.replace(/[{}]/g, '').trim();
};

// Function to normalize variable syntax by reducing multiple brackets to two
const normalizeVariableSyntax = (value: string): string => {
  const strippedValue = stripBrackets(value);

  return `{{${strippedValue}}}`;
};

/**
 * Parses a variable from the editor's content into structured data.
 * This function is crucial for the variable pill system as it:
 * 1. Extracts the position and content of variables like {{ subscriber.name | uppercase }}
 * 2. Separates the base variable name from its filters (filters after |)
 * 3. Provides the necessary information for rendering variable pills in the editor
 *
 * @example
 * Input variable for "{{ subscriber.name | uppercase }}" or "subscriber.name | uppercase"
 * Returns:
 * {
 *   fullLiquidExpression: "subscriber.name | uppercase",
 *   liquidVariable: "{{ subscriber.name | uppercase }}",
 *   name: "subscriber.name",
 *   nameRoot: "subscriber",
 *   start: [match start index],
 *   end: [match end index],
 *   filtersArray: ["uppercase", "lowercase"],
 *   filters: "|uppercase|lowercase"
 * }
 */
export function parseVariable(variable: string): VariableMatch | undefined {
  const liquidVariable = variable.match(/^\{+.*\}+$/) ? normalizeVariableSyntax(variable) : `{{${variable}}}`;
  const regex = new RegExp(VARIABLE_REGEX_STRING, 'g');
  const match = regex.exec(liquidVariable);

  if (!match) {
    return;
  }

  const fullLiquidExpression = match[1].trim();
  const parts = fullLiquidExpression.split('|').map((part) => part.trim());
  const name = parts[0];
  const hasFilters = parts.length > 1;

  return {
    fullLiquidExpression: name ? fullLiquidExpression : '',
    liquidVariable,
    name,
    nameRoot: name.trim().split('.')[0],
    filtersArray: hasFilters ? parts.slice(1) : [],
    filters: hasFilters ? `| ${parts.slice(1).join(' | ')}` : '',
  };
}
