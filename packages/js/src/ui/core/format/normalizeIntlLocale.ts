/**
 * Converts Novu locale codes (e.g. de_DE) to BCP 47 tags expected by Intl APIs (e.g. de-DE).
 */
export function normalizeIntlLocale(locale: string): string {
  return locale.replace(/_/g, '-');
}
