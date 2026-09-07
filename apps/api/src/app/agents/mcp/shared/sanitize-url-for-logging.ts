/**
 * Produce a log-safe representation of a URL by stripping userinfo and
 * query/hash segments that may contain credentials or access tokens.
 */
export function sanitizeUrlForLogging(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed.replace(/\/\/[^@/]+@/g, '//[REDACTED]@').split(/[?#]/)[0];
  }
}
