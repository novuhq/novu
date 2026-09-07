import { getLocaleByIso } from '@novu/shared';

/**
 * Get a human-readable display name for a locale code
 * @param localeCode - The locale code (e.g., 'en_US', 'es_ES')
 * @returns A formatted display name (e.g., 'English, United States')
 */
export function getLocaleDisplayName(localeCode: string): string {
  const locale = getLocaleByIso(localeCode);

  if (locale?.langName) {
    // Extract language and country from langName like "Spanish (Spain)" -> "Spanish, Spain"
    const match = locale.langName.match(/^(.+?)\s*\((.+?)\)$/);

    if (match) {
      return `${match[1]}, ${match[2]}`;
    }

    return locale.langName;
  }

  return localeCode;
}

/**
 * Format a date for display in the translations module
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatTranslationDate(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format a time for display in the translations module
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatTranslationTime(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', options);
}
