import { getCommonLocales, isLocaleSupported, normalizeLocale } from './locale-registry';

export interface ILocaleValidationResult {
  isValid: boolean;
  normalizedLocale?: string;
  errorMessage?: string;
}

/**
 * Validates a locale string and returns normalized result
 * @param value - The locale string to validate
 * @param context - Additional context for error messages (e.g., 'parameter', 'filename')
 * @returns ILocaleValidationResult with validation status and normalized locale
 */
export function validateLocale(value: unknown, context: string = 'locale'): ILocaleValidationResult {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      errorMessage: `${context} must be a valid string. Please provide a locale code like 'en_US' or 'fr_FR'.`,
    };
  }

  // Normalize hyphens to underscores (en-US -> en_US) to maintain consistency with database format
  const normalizedLocale = normalizeLocale(value);

  // Check if it's in our supported locales list (this is the only validation we need!)
  if (!isLocaleSupported(normalizedLocale)) {
    const supportedExamples = getCommonLocales().slice(0, 5).join(', ');
    return {
      isValid: false,
      errorMessage: `${context} '${value}' is not supported. Please use one of the supported locales (e.g., ${supportedExamples}). See the full list of supported locales in the documentation.`,
    };
  }

  return {
    isValid: true,
    normalizedLocale,
  };
}

/**
 * Validates a locale filename (must end with .json)
 * @param filename - The filename to validate
 * @returns ILocaleValidationResult with validation status
 */
export function validateLocaleFilename(filename: unknown): ILocaleValidationResult {
  if (!filename || typeof filename !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Filename must be a valid string. Please provide a filename like "en_US.json".',
    };
  }

  // Split filename and extension
  const parts = filename.split('.');
  if (parts.length !== 2 || parts[1] !== 'json') {
    return {
      isValid: false,
      errorMessage: `Filename must be in format "locale.json" (e.g., en_US.json, fr_FR.json). Received: '${filename}'.`,
    };
  }

  // Validate the locale part
  const localeResult = validateLocale(parts[0], 'filename locale');
  if (!localeResult.isValid) {
    return {
      isValid: false,
      errorMessage: `Invalid locale in filename '${filename}'. ${localeResult.errorMessage}`,
    };
  }

  return {
    isValid: true,
    normalizedLocale: localeResult.normalizedLocale,
  };
}

/**
 * Simple validation that throws on invalid locale
 * @param value - The locale to validate
 * @param context - Context for error message
 * @returns The normalized locale string
 * @throws Error if locale is invalid
 */
export function validateLocaleOrThrow(value: unknown, context: string = 'locale'): string {
  const result = validateLocale(value, context);
  if (!result.isValid) {
    throw new Error(result.errorMessage);
  }

  return result.normalizedLocale as string;
}
