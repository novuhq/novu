export function isAbsoluteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

const SAFE_NAVIGATION_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Whitelist hrefs handed to `window.location.assign` / `window.open` / anchor `href` so
 * `javascript:`, `data:`, `vbscript:`, etc. can't ride through navigation helpers.
 * Absolute hrefs are parsed; relative paths (start with `/`) and same-page fragments are trusted.
 */
export function isSafeNavigationHref(href: string): boolean {
  if (!href) return false;
  // Reject protocol-relative URLs (e.g. `//evil.example`) before the "starts with `/`" shortcut —
  // browsers resolve them against the current scheme and can leak the user to arbitrary hosts.
  if (href.startsWith('//')) return false;
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return true;

  try {
    const parsed = new URL(href, window.location.origin);

    return SAFE_NAVIGATION_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
