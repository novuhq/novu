// Re-export the locale interface and data from the local locales file
// This creates a single source of truth for all locale operations
import type { Locale } from './locales';
import { locales } from './locales';

export type ILocale = Locale;
export const SUPPORTED_LOCALES = locales;

/**
 * Get all supported locales
 */
export function getAllLocales(): ILocale[] {
  return SUPPORTED_LOCALES;
}

/**
 * Get all supported locale ISO codes
 */
export function getSupportedLocaleIsoCodes(): string[] {
  return SUPPORTED_LOCALES.map((locale) => locale.langIso);
}

/**
 * Check if a locale ISO code is supported
 */
export function isLocaleSupported(langIso: string): boolean {
  return SUPPORTED_LOCALES.some((locale) => locale.langIso === langIso);
}

/**
 * Get locale by ISO code
 */
export function getLocaleByIso(langIso: string): ILocale | undefined {
  return SUPPORTED_LOCALES.find((locale) => locale.langIso === langIso);
}

/**
 * Get most common locales for better UX performance
 */
export function getCommonLocales(): string[] {
  return [
    'en_US',
    'en_GB',
    'es_ES',
    'fr_FR',
    'de_DE',
    'it_IT',
    'pt_PT',
    'pt_BR',
    'ru_RU',
    'zh_CN',
    'zh_TW',
    'ja_JP',
    'ko_KR',
    'ar_SA',
    'hi_IN',
    'nl_NL',
    'sv_SE',
    'da_DK',
    'no_NO',
    'fi_FI',
    'pl_PL',
    'tr_TR',
    'cs_CZ',
    'hu_HU',
    'ro_RO',
  ];
}

/**
 * Normalize locale string (convert hyphens to underscores)
 */
export function normalizeLocale(locale: string): string {
  return locale.replace(/-/g, '_');
}
