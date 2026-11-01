import { createHash } from 'node:crypto';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../../agents/shared/util/email-normalization';

/** A `to` value that names a mailbox, or null when it is a contact id. */
export function explicitEmailAddress(value: string): string | null {
  const address = normalizeEmailForLookup(value);

  return isValidEmailForLookup(address) ? address : null;
}

/**
 * The contact id an email address gets: the part before the `@`, lowercased, with anything but
 * letters, digits, dots, dashes and underscores turned into dashes. With `withSuffix`, a short hash of
 * the whole address is added, so `alice@acme.com` and `alice@gmail.com` stay two contacts.
 * Same rules as `@agentinbox/cli`.
 */
export function contactIdFromEmail(email: string, withSuffix = false): string {
  const address = email.trim().toLowerCase();
  const local = address.slice(0, address.indexOf('@'));
  const base =
    local
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 50) || 'contact';

  if (!withSuffix) {
    return base;
  }

  return `${base}-${createHash('sha256').update(address).digest('hex').slice(0, 6)}`;
}

/** Plain id when the local part is already a clean id, then the hashed id. */
export function contactIdCandidates(email: string): string[] {
  const address = email.trim().toLowerCase();
  const local = address.slice(0, address.indexOf('@'));
  const plainId = contactIdFromEmail(address);

  return plainId === local ? [plainId, contactIdFromEmail(address, true)] : [contactIdFromEmail(address, true)];
}
