import { LiquidError, RenderError } from 'liquidjs';

/**
 * Copy of LiquidErrors type from liquidjs since it's not exported.
 * Used to handle multiple render errors that can occur during template parsing.
 * @see https://github.com/harttle/liquidjs/blob/d61855bf725a6deba203201357f7455f6f9b4a32/src/util/error.ts#L65
 */
export class LiquidErrors extends LiquidError {
  errors: RenderError[];
}

/**
 * Validates if the provided template is a non-empty string
 */
export function isValidTemplate(template: unknown): template is string {
  return typeof template === 'string' && template.length > 0;
}

/**
 * Extracts all Liquid expressions wrapped in {{ }} from a given string
 * @example
 * "{{ username | append: 'hi' }}" => ["{{ username | append: 'hi' }}"]
 * "<input value='{{username}}'>" => ["{{username}}"]
 */
export function extractLiquidExpressions(str: string): string[] {
  if (!str) return [];

  const LIQUID_EXPRESSION_PATTERN = /{{\s*[^{}]*}}/g;

  return str.match(LIQUID_EXPRESSION_PATTERN) || [];
}

export const DIGEST_EVENTS_VARIABLE_PATTERN = /^steps\.[^.]+\.events$/;
export const DIGEST_EVENTS_PAYLOAD_VARIABLE_PATTERN = /^steps\.[^.]+\.events\.payload\./;
export const VALID_DYNAMIC_PATHS = [
  'subscriber.data.',
  'payload.',
  'context.',
  'env.',
  /^steps\.[^.]+\.events\[\d+\]\.payload\./,
] as const;

export function isValidDynamicPath(variableName: string): boolean {
  return VALID_DYNAMIC_PATHS.some((path) =>
    typeof path === 'string' ? variableName.startsWith(path) : path.test(variableName)
  );
}

export function isLiquidErrors(error: unknown): error is LiquidErrors {
  return error instanceof LiquidError && 'errors' in error && Array.isArray((error as LiquidErrors).errors);
}
