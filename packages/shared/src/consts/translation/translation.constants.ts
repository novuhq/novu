/**
 * Default locale used as fallback when no locale is specified
 */
export const DEFAULT_LOCALE = 'en_US';

/**
 * Translation namespace separator
 */
export const TRANSLATION_NAMESPACE_SEPARATOR = 't.';

/**
 * Regular expression to match translation keys in the format {{t.key}} with optional spaces
 * Matches: {{t.key}}, {{ t.key }}, {{  t.key  }}, etc.
 */
export const TRANSLATION_KEY_REGEX = /\{\{\s*t\.([^}]+?)\s*\}\}/g;

/**
 * Regular expression to match a single translation key in the format {{t.key}} with optional spaces
 * (non-global version for single matches)
 */
export const TRANSLATION_KEY_SINGLE_REGEX = /\{\{\s*t\.([^}]+?)\s*\}\}/;

/**
 * Translation trigger character (without spaces)
 */
export const TRANSLATION_TRIGGER_CHARACTER = '{{t.';

/**
 * Opening delimiter for translation format
 */
export const TRANSLATION_DELIMITER_OPEN = '{{';

/**
 * Closing delimiter for translation format
 */
export const TRANSLATION_DELIMITER_CLOSE = '}}';

/**
 * Length of the translation prefix ({{t.)
 */
export const TRANSLATION_PREFIX_LENGTH = 4;

/**
 * Template for missing translation placeholder
 */
export const MISSING_TRANSLATION_TEMPLATE = (key: string) => `[Translation missing: ${key}]`;

/**
 * Default template for translation key patterns
 */
export const TRANSLATION_DEFAULT_TEMPLATE = (key: string) => `{{t.${key}}}`;
