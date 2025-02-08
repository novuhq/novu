import type { VariableMatch } from './types';

/**
 * Parses a variable match from the editor's content into structured data.
 * This function is crucial for the variable pill system as it:
 * 1. Extracts the position and content of variables like {{ subscriber.name | uppercase }}
 * 2. Separates the base variable name from its filters (filters after |)
 * 3. Provides the necessary information for rendering variable pills in the editor
 *
 * @example
 * Input match for "{{ subscriber.name | uppercase }}"
 * Returns:
 * {
 *   fullLiquidExpression: "subscriber.name | uppercase",
 *   name: "subscriber.name",
 *   start: [match start index],
 *   end: [match end index],
 *   filters: ["uppercase"]
 * }
 */
export function parseVariable(match: RegExpExecArray): VariableMatch {
  const start = match.index;
  const end = start + match[0].length;
  const fullLiquidExpression = match[1].trim();
  const parts = fullLiquidExpression.split('|').map((part) => part.trim());
  const name = parts[0];
  const hasFilters = parts.length > 1;

  return {
    fullLiquidExpression,
    name,
    start,
    end,
    filters: hasFilters ? parts.slice(1) : [],
  };
}

export function isTypingVariable(content: string, pos: number): boolean {
  const beforeCursor = content.slice(0, pos);
  const afterCursor = content.slice(pos);
  const lastOpenBrackets = beforeCursor.lastIndexOf('{{');
  const nextCloseBrackets = afterCursor.indexOf('}}');

  return lastOpenBrackets !== -1 && (nextCloseBrackets === -1 || beforeCursor.indexOf('}}', lastOpenBrackets) === -1);
}
