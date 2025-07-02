/**
 * Default locale used as fallback when no locale is specified
 */
export const DEFAULT_LOCALE = 'en_US';

/**
 * Regular expression to match translation keys in the format {t.key}
 */
export const TRANSLATION_KEY_REGEX = /\{t\.([^}]+)\}/g;

/**
 * Regular expression to match a single translation key in the format {t.key}
 * (non-global version for single matches)
 */
export const TRANSLATION_KEY_SINGLE_REGEX = /\{t\.([^}]+)\}/;

export const TRANSLATION_TRIGGER_CHARACTER = '{t.';
