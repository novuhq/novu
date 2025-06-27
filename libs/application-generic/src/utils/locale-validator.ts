export interface ILocaleValidationResult {
  isValid: boolean;
  normalizedLocale?: string;
  errorMessage?: string;
}

export class LocaleValidator {
  private static readonly LOCALE_PATTERN = /^[a-z]{2,3}_[A-Za-z]{2,4}(_[A-Z]{2})?$/i;

  /**
   * Validates a locale string and returns normalized result
   * @param value - The locale string to validate
   * @param context - Additional context for error messages (e.g., 'parameter', 'filename')
   * @returns ILocaleValidationResult with validation status and normalized locale
   */
  static validate(value: unknown, context: string = 'locale'): ILocaleValidationResult {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        errorMessage: `${context} must be a valid string. Please provide a locale code like 'en_US' or 'fr_FR'.`,
      };
    }

    // Normalize hyphens to underscores (en-US -> en_US) to maintain consistency with database format
    const normalizedLocale = value.replace(/-/g, '_');

    if (!this.LOCALE_PATTERN.test(normalizedLocale)) {
      return {
        isValid: false,
        errorMessage: `${context} must be a valid locale code with language and country (e.g., en_US, fr_FR, zh_Hans_CN). Received: '${value}'.`,
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
  static validateFilename(filename: unknown): ILocaleValidationResult {
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
    const localeResult = this.validate(parts[0], 'filename locale');
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
  static validateOrThrow(value: unknown, context: string = 'locale'): string {
    const result = this.validate(value, context);
    if (!result.isValid) {
      throw new Error(result.errorMessage);
    }

    return result.normalizedLocale!;
  }
}
