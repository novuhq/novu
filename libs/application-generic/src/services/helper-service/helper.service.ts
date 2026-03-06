import { v1 as uuidv1 } from 'uuid';

export function createGuid(): string {
  return uuidv1();
}

export function capitalize(text: string) {
  if (typeof text !== 'string') return '';

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formats a string to sentence case.
 * @param text - The string to format.
 * @returns The formatted string.
 *
 * @example
 * ```typescript
 * toSentenceCase('camelCaseText') // 'Camel case text'
 * ```
 */
export function toSentenceCase(text: string) {
  if (!text) return '';

  // Insert spaces before uppercase letters and convert the entire string to lowercase
  const formattedText = text.replace(/([A-Z])/g, ' $1').toLowerCase();

  // Capitalize the first character
  return formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
}

export function getFileExtensionFromPath(filePath: string) {
  const regexp = /\.([0-9a-z]+)(?:[?#]|$)/i;
  const extension = filePath.match(regexp);

  return extension && extension[1];
}
