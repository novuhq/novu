import { CompletionContext } from '@codemirror/autocomplete';
import {
  TRANSLATION_DELIMITER_CLOSE,
  TRANSLATION_DELIMITER_OPEN,
  TRANSLATION_KEY_SINGLE_REGEX,
  TRANSLATION_NAMESPACE_SEPARATOR,
} from '@novu/shared';

/**
 * Checks if user is currently typing a translation pattern (e.g., {{t.some...)
 * Used to prevent showing pill decorations while actively typing
 */
export function isTypingTranslation(content: string, pos: number): boolean {
  const beforeCursor = content.slice(0, pos);

  // Check if we have an incomplete translation pattern before cursor
  const hasOpenPattern = beforeCursor.includes(TRANSLATION_DELIMITER_OPEN + TRANSLATION_NAMESPACE_SEPARATOR);
  if (!hasOpenPattern) return false;

  // Find the last occurrence of translation start
  const lastPatternStart = beforeCursor.lastIndexOf(TRANSLATION_DELIMITER_OPEN + TRANSLATION_NAMESPACE_SEPARATOR);
  const patternToCheck = beforeCursor.slice(lastPatternStart);

  // If the pattern is not closed, we're typing
  return !patternToCheck.includes(TRANSLATION_DELIMITER_CLOSE);
}

/**
 * Determines if cursor is inside a variable context ({{payload.x}}) vs translation context ({{t.x}})
 * Used by autocomplete to avoid conflicts between variable and translation suggestions
 */
export function isInsideVariableContext(context: CompletionContext): boolean {
  const { state, pos } = context;
  const beforeCursor = state.sliceDoc(0, pos);

  const lastOpen = beforeCursor.lastIndexOf(TRANSLATION_DELIMITER_OPEN);
  const lastClose = beforeCursor.lastIndexOf(TRANSLATION_DELIMITER_CLOSE);

  // Not inside any delimiters
  if (lastOpen === -1) return false;

  // We're inside delimiters if open comes after close
  if (lastClose === -1 || lastOpen > lastClose) {
    // Check what follows the opening delimiter
    const contentAfterOpen = beforeCursor.slice(lastOpen + TRANSLATION_DELIMITER_OPEN.length).trim();

    // It's NOT a variable if it starts with translation namespace
    const isTranslation =
      contentAfterOpen.startsWith(TRANSLATION_NAMESPACE_SEPARATOR) ||
      contentAfterOpen === TRANSLATION_NAMESPACE_SEPARATOR.slice(0, -1); // just "t"

    return !isTranslation;
  }

  return false;
}

/**
 * Parses a complete translation expression to extract the key
 * Example: "{{t.welcome}}" -> { key: "welcome", fullExpression: "{{t.welcome}}" }
 */
export function parseTranslation(translation: string): { key: string; fullExpression: string } | undefined {
  if (translation.includes('\n')) return undefined;

  const match = translation.match(TRANSLATION_KEY_SINGLE_REGEX);
  if (!match) return undefined;

  const key = match[1]?.trim();
  if (!key) return undefined;

  return { key, fullExpression: translation };
}

/**
 * Formats translation key for compact display
 * Example: "common.buttons.submit" -> "..buttons.submit"
 */
export function formatDisplayKey(translationKey: string): string {
  if (!translationKey) return '';

  const parts = translationKey.split('.');
  return parts.length >= 2 ? '..' + parts.slice(-2).join('.') : translationKey;
}
