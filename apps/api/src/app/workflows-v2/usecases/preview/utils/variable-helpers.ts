import { replace } from 'es-toolkit/compat';

/**
 * Replaces all occurrences of a search string with a replacement string.
 */
export function replaceAll(text: string, searchValue: string, replaceValue: string): string {
  return replace(text, new RegExp(_.escapeRegExp(searchValue), 'g'), replaceValue);
}
