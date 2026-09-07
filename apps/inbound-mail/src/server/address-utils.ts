/**
 * Returns the domain portion of an email address (everything after the first
 * `@`), or `null` when the address has no `@` at all.
 *
 * SMTP envelope addresses are attacker-controlled and RFC 5321 allows a
 * domain-less address such as `<postmaster>`, so callers must handle the `null`
 * case rather than assuming a match is always present.
 */
export function extractEmailDomain(email: string): string | null {
  const match = /@(.*)/.exec(email);

  return match ? match[1] : null;
}
