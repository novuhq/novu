/**
 * Masks an email for status / error surfaces so we don't echo the full address
 * back through public invite responses. `alice@example.com` → `a***@example.com`.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) {
    return '***';
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const head = local.charAt(0);

  return `${head}***@${domain}`;
}
