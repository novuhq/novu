/**
 * Regex pattern for validating in-app redirect URLs with template variables. Matches three cases:
 *
 * 1. URLs that start with template variables like {{variable}}
 *    - Example: {{variable}}, {{variable}}/path
 *
 * 2. Full URLs that may contain template variables anywhere
 *    - Excludes mailto: links
 *    - Example: https://example.com, https://example.com/{{variable}}
 *
 * 3. Paths starting with / that may contain template variables anywhere
 *    - Excludes protocol-relative URLs (//host)
 *    - Example: /path/to/page, /path/{{variable}}/page
 */
export const IN_APP_REDIRECT_URL_REGEX =
  /^(?:\{\{[^}]*\}\}.*|(?!mailto:)(?:https?:\/\/[^\s/$.?#][^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)|\/(?!\/)[^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)$/;

export const IN_APP_REDIRECT_TARGETS = ['_self', '_blank', '_parent', '_top', '_unfencedTop'] as const;

export type InAppRedirectTarget = (typeof IN_APP_REDIRECT_TARGETS)[number];

export function isValidInAppRedirectUrl(url: string): boolean {
  return IN_APP_REDIRECT_URL_REGEX.test(url);
}

export function isValidInAppRedirectTarget(target: unknown): target is InAppRedirectTarget {
  return typeof target === 'string' && IN_APP_REDIRECT_TARGETS.includes(target as InAppRedirectTarget);
}

export type InAppRedirect = {
  url: string;
  target?: InAppRedirectTarget;
};

export function sanitizeInAppRedirect(url?: string, target?: unknown): InAppRedirect | undefined {
  if (!url || !isValidInAppRedirectUrl(url)) {
    return undefined;
  }

  return {
    url,
    ...(isValidInAppRedirectTarget(target) ? { target } : {}),
  };
}
